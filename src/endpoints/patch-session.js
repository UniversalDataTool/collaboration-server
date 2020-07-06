const {send, json} = require("micro")
const cors = require("micro-cors")()
const fjp = require("fast-json-patch")
const hash = require("../../utils/hash.js")
const error = require("../../utils/error")
const getDB = require('../db')
const db = getDB({databasePath: 'udt.db', verbose: null})

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

    // console.log(session.udt_json)
    let newJSON = {...JSON.parse(session.udt_json)}
    fjp.applyPatch(newJSON, udtPatches)

    await patchSamples(session.session_state_id, samplePatches)
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

    return send(res, 200, {latestVersion, hashOfLatestState: hash(newJSON)})
})

const patchSamples = (async (sessionId, samplePatches) => {

    const samplesToAdd = []
    const samplesToUpdateAnnotation = {}

    samplePatches.forEach(patch => {
        if (patch.op === 'add') {
            if (patch.path === '/samples/-') {
                samplesToAdd.push(patch.value)
            } else if (/samples\/[0-9]*\/annotation/.test(patch.path)) {
                const pathArray = patch.path.split('/')
                samplesToUpdateAnnotation[pathArray[2]] = {
                    session_sample_id: pathArray[2],
                    value: patch.value
                }
            }
        }
    })

    console.log('samplesToAdd', samplesToAdd)
    console.log('samplesToUpdate', samplesToUpdateAnnotation)

    const samplesQueries = []
    if (samplesToAdd.length) {
        let sessionSampleId = -1
        const latestSample = db.prepare('SELECT * FROM sample_state WHERE session_state_id = ? ORDER BY session_sample_id DESC LIMIT 1').get(sessionId);
        console.log('latestSample', sessionId)
        if (latestSample) {
            sessionSampleId = parseInt(latestSample.session_sample_id)
        }

        console.log('sessionSampleId', sessionSampleId)
        samplesToAdd.forEach((sample) => {
            sessionSampleId += 1
            samplesQueries.push(db.prepare('INSERT INTO sample_state (session_state_id, session_sample_id, content) VALUES (?, ?, ?)').run(sessionId, sessionSampleId, JSON.stringify(sample)));
        })
    }

    if (Object.keys(samplesToUpdateAnnotation).length) {
        const updatedSamples = []
        const samples = db.prepare('SELECT * FROM latest_sample_state WHERE session_state_id = ? AND session_sample_id IN (?)').all(sessionId, Object.keys(samplesToUpdateAnnotation));
        console.log('samples', samples)
        samples.forEach(sample => {
            let annotation = JSON.parse(sample.annotation)
            if (Array.isArray(annotation)) {
                annotation.push(samplesToUpdateAnnotation[sample.session_sample_id].value)
            } else {
                annotation = [samplesToUpdateAnnotation[sample.session_sample_id].value]
            }
            updatedSamples.push({
                ...sample,
                version: sample.version + 1,
                annotation: JSON.stringify(annotation)
            })
        })

        updatedSamples.forEach((sample) => {
            samplesQueries.push(
                db.prepare('INSERT INTO sample_state (session_state_id, session_sample_id, version, annotation, content) VALUES (?, ?, ?, ?, ?)')
                    .run(sessionId, sample.session_sample_id, sample.version, sample.annotation, sample.content));
        })
    }

    await Promise.all(samplesQueries)
})