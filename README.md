# Universal Data Tool Collaboration Server

[![npm version](https://badge.fury.io/js/udt-collaboration-server.svg)](https://badge.fury.io/js/udt-collaboration-server)

> _Note: This is just for people that want to run their own collaboration server. You don't need to use
> this to collaborate with the Universal Data Tool, because there's a builtin public server._

This project runs a collaboration server that can be used with the Universal Data Tool. To use a custom collaboration server,
go into the UDT and open a project. Under `Setup > Advanced`, you'll see a button for "Custom Collaboration Server". Put in
the address to the server this project runs and you should be able to collaborate with anyone else on that server.

## Usage

```bash
npm install -g udt-collaboration-server

udt-collaboration-server --port 80
```

## Usage as an npm module

```javascript
const runCollaborationServer = require("udt-collaboration-server")
const server = runCollaborationServer({ port: 3000 })

// Later...
server.close()
```

## Support & Docs

Join the [Universal Data Tool Slack](https://universaldatatool.slack.com) if you run into any issues!

You may find [the UDT docs](https://docs.universaldatatool.com) helpful as well!

## Technical Details

### Technologies Used

- [fast-json-patch](https://www.npmjs.com/package/fast-json-patch) is used to send patches
- [json-stable-stringify](https://www.npmjs.com/package/json-stable-stringify) is used to hash objects to produce `hashOfLatestState`
- [micro](https://github.com/zeit/micro) is used for endpoints
- [ava](https://www.npmjs.com/package/ava) is used for testing
- [sqlite](https://www.sqlite.org/index.html) is used as the database
- [better-sqlite3](https://www.npmjs.com/package/better-sqlite3) is an npm module that makes the connection to sqlite very fast and simple

### API

Check out the [API Sequence Diagram here](https://github.com/UniversalDataTool/collaboration-server/blob/master/docs/sequenceDiagram-v1.png).

This server exposes the following endpoints:

- `POST /api/session`: Creates a link to a UDT session. Whoever initiates collaboration mode calls this. It is called exactly once to start a session. A session lasts indefinitely. Returns the url to the session.
- `GET /api/session/<session_id>`: Gets the latest version of the UDT JSON file by getting the latest session_state (see DB Architecture)
- `GET /api/session/<session_id>/diffs`: Gets recent diffs for the JSON file
  - The requestor must provide the querystring parameter `since=<ISODATE>` indicating that they would like the diffs since the last time they polled.
  - The UDT will poll this every 250-500ms. Most of the time it'll return an empty array of patches.
  - Responds with `{ patches: Array<JSONDiffPatch>, hashOfLatestState, latestVersion }`
- `PATCH /api/session/<session_id>`: Sends a JSONDiffPatch object with changes
  - Request contains `{ patch, mySessionStateId }`
    - `patch` is applied against the latest session state to generate a new session state.
    - `mySessionStateId` isn't used (for now)
  - Should return `{ hashOfLatestState, latestVersion }`

### Database Architecture

Check the [schema.js](https://github.com/UniversalDataTool/collaboration-server/blob/master/src/db/schema.js)
