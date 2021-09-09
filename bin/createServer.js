#!/usr/bin/env -S npx corenode
const { createEviteServer } = require('../core')

createEviteServer()
    .then((server) => {
        server.listen()
    })
    .catch((err) => {
        console.error(err)
    })