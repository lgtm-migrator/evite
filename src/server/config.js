const path = require("path")
const selfSourceGlob = `${path.resolve(__dirname, "..")}/**/**`

const BaseConfig = {
    plugins: [
        require("@vitejs/plugin-react-refresh"),
        require("@rollup/plugin-node-resolve").default({
            browser: true,
        }),
    ],
    build: {
        emptyOutDir: true,
    },
    server: {
        watch: {
            ignored: [selfSourceGlob, "/**/**/.cache", `${process.cwd()}/**/**/.cache`],
            usePolling: true,
            interval: 100,
        },
        port: 8000,
        host: "0.0.0.0",
        fs: {
            allow: [".."]
        },
    },
    define: Object(),
    resolve: Object()
}

class ConfigController {
    constructor(override) {
        this.config = BaseConfig ?? Object()

        if (typeof override !== "undefined") {
            this.mutate(override)
        }

        return this
    }

    static get config() {
        return BaseConfig
    }

    mutate = (mutation, ...context) => {
        if (typeof mutation === "function") {
            const result = mutation(this.config, ...context)
            this.config = { ...result }
        }
    }
}

module.exports = {
    ConfigController,
    BaseConfig,
}