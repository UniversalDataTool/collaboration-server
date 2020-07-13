const {send, json} = require("micro")
const cors = require("micro-cors")()
const fjp = require("fast-json-patch")
const hash = require("../../utils/hash.js")
const error = require("../../utils/error")
const getDB = require('../db')
const db = getDB({databasePath: 'udt.db', verbose: null})
const asyncForEach = require('../../utils/asyncForEach')

module.exports = cors(async (req, res) => {
    if (req.method === "OPTIONS") return send(res, 200, "ok")
    const body = await json(req)
    const sessionId = req.params.session_id

    if (!body) return error(res, 400, "Need JSON body")
    if (!body.patch) return error(res, 400, `Body should have "patch" key`)

    const session = db.prepare('SELECT * FROM latest_session_state WHERE short_id = ? LIMIT 1').get(sessionId);

    if (!session) return error(res, 404, "Session Not Found")

    const samplePatches = body.patch.filter(patch => patch.path.includes('/samples'))
    const udtPatches = body.patch.filter(patch => !patch.path.includes('/samples'))

    let newJSON = {...JSON.parse(session.udt_json)}
    fjp.applyPatch(newJSON, udtPatches)

    await patchSamples(session.short_id, samplePatches)
    const latestVersion = session.version + 1

    const insertStmt = db.prepare(`
        INSERT INTO session_state
        (previous_session_state_id, short_id, user_name, patch, version, udt_json)
        VALUES (?, ?, ?, ?, ?, ?)`);

    insertStmt.run(
        session.session_state_id,
        sessionId,
        body.userName || null,
        JSON.stringify(body.patch),
        latestVersion,
        JSON.stringify(newJSON)
    );

    const samplesQueryResults = db.prepare(`SELECT  *
                           FROM latest_sample_state
                           WHERE session_short_id = ?`).all(session.short_id);

    const samples = []
    samplesQueryResults.forEach(sample => {
        const content = JSON.parse(sample.content)
        const annotation = JSON.parse(sample.annotation)
        samples.push(Object.assign({}, content, {annotation}))
    })

    newJSON.samples = samples

    return send(res, 200, {latestVersion, hashOfLatestState: hash(newJSON)})
})

const patchCreateSamples = (async (sessionId, samplesToAdd) => {
    const samplesQueries = []
    if (samplesToAdd.length) {
        let sessionSampleId = -1
        const latestSample = db.prepare('SELECT * FROM sample_state WHERE session_short_id = ? ORDER BY session_sample_id DESC LIMIT 1').get(sessionId);
        if (latestSample) {
            sessionSampleId = parseInt(latestSample.session_sample_id)
        }

        samplesToAdd.forEach((sample) => {
            sessionSampleId += 1
            samplesQueries.push(db.prepare('INSERT INTO sample_state (session_short_id, session_sample_id, content) VALUES (?, ?, ?)').run(sessionId, sessionSampleId, JSON.stringify(sample)));
        })
    }
    return samplesQueries
})

const patchRemoveSamples = (async (sessionId, patches) => {
    if (patches.length) {
        await asyncForEach(patches, async (patch) => {
            const pathArray = patch.path.split('/')
            const indexToRemove = pathArray[2]

            await db.prepare('DELETE FROM sample_state WHERE session_short_id = ? AND session_sample_id = ? ').run(sessionId, indexToRemove);
            await db.prepare(`
                INSERT INTO sample_state 
                    (session_short_id, session_sample_id, version, content, summary, annotation) 
                SELECT 
                    session_short_id, session_sample_id - 1, version + 1, content, summary, annotation
                FROM 
                    latest_sample_state
                WHERE 
                    session_short_id = ? AND session_sample_id > ?`).run(sessionId, indexToRemove);

            await db.prepare(`
                DELETE FROM sample_state 
                WHERE sample_state_id IN (
                    SELECT sample_state_id
                    FROM sample_state
                    WHERE session_sample_id = (
                        SELECT session_sample_id
                        FROM latest_sample_state 
                        WHERE session_short_id = ? 
                        ORDER BY session_sample_id DESC 
                        limit 1
                    )
                )`).run(sessionId);
        })
    }
})

const patchSamplesAnnotation = (async (sessionId, samplePatches) => {

    const sampleIds = {}
    samplePatches.forEach(patch => {
        const pathArray = patch.path.split('/')
        const sessionSampleId = pathArray[2]
        sampleIds[sessionSampleId] = {sessionSampleId}
    })

    const samplesArray = []
    const samples = db.prepare('SELECT * FROM latest_sample_state WHERE session_short_id = ? ORDER BY session_sample_id ASC').all(sessionId);
    samples.forEach(sample => {
        const content = JSON.parse(sample.content)
        const annotation = JSON.parse(sample.annotation)
        samplesArray.push({
            ...content,
            annotation: annotation,
            version: parseInt(sample.version),
            session_sample_id: sample.session_sample_id
        })
    })
    let newJSON = {samples: samplesArray}
    fjp.applyPatch(newJSON, samplePatches)

    const queries = []
    Object.keys(sampleIds).forEach(sampleId => {
        const sample = samplesArray[sampleId]
        const session_sample_id = sample.session_sample_id
        const version = sample.version + 1
        const annotation = sample.annotation

        delete sample.session_sample_id
        delete sample.version
        delete sample.annotation

        queries.push(
            db.prepare('INSERT INTO sample_state (session_short_id, session_sample_id, version, annotation, content) VALUES (?, ?, ?, ?, ?)')
                .run(sessionId, session_sample_id, version, JSON.stringify(annotation), JSON.stringify(sample)));
    })

    return queries
})

const patchSamples = (async (sessionId, samplePatches) => {

    const samplesToAdd = []
    const samplesToRemove = []
    const samplesAnnotationPatches = []
    samplePatches.forEach(patch => {
        if (patch.op === 'add' && patch.path === '/samples/-') {
            samplesToAdd.push(patch.value)
        } else if (/samples\/[0-9]\/\w/.test(patch.path)) {
            samplesAnnotationPatches.push(patch)
        } else if (patch.op === 'remove' && /samples\/[0-9]$/.test(patch.path)) {
            samplesToRemove.push(patch)
        }
    })

    const patchCreateSamplesQuery = await patchCreateSamples(sessionId, samplesToAdd)
    const patchSamplesAnnotationQueries =  await patchSamplesAnnotation(sessionId, samplesAnnotationPatches)
    await Promise.all([...patchCreateSamplesQuery, ...patchSamplesAnnotationQueries])
    await patchRemoveSamples(sessionId, samplesToRemove)
})