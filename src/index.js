import React from "react"
import { createBrowserHistory } from "history"
import { verbosity, objectToArrayMap } from "@corenode/utils"
import { EventBus, classAggregation } from "./lib"

function getEviteConstructor(context) {
    return class EviteApp {
        constructor() {
            this.constructorContext = context

            // set window app controllers
            this.app = window.app = Object()
            this.controllers = this.app.controllers = {}

            // states
            this.loading = true
            this.beforeInit = []

            // controllers
            this.history = window.app.history = createBrowserHistory()
            this.eventBus = window.app.eventBus = new EventBus()
            this.builtInEvents = null

            // global state
            this.globalStateContext = React.createContext()
            this.globalDispatchContext = React.createContext()
            this.globalState = {}

            // extends class
            if (Array.isArray(this.constructorContext.extensions)) {
                this.constructorContext.extensions.forEach((extension) => {
                    this.attachExtension(extension)
                })
            }
        }

        attachExtension = (extension) => {
            if (typeof extension.key !== "string") {
                return false
            }

            // autoexecute the exec function
            if (typeof extension.exec === "function") {
                extension.exec(this)
            }

            // this overwritte `this` property
            if (typeof extension.self !== "undefined") {
                this.bindSelf(extension.self)
            }

            if (typeof extension.expose !== "undefined") {
                let exposeArray = []
                if (Array.isArray(extension.expose)) {
                    exposeArray = extension.expose
                } else {
                    exposeArray.push(extension.expose)
                }

                exposeArray.forEach((expose) => {
                    if (typeof expose.self !== "undefined") {
                        this.bindSelf(expose.self)
                    }
                    if (typeof expose.attachToInitializer !== "undefined") {
                        this.attachToInitializer(expose.attachToInitializer)
                    }
                })
            }
        }

        attachToInitializer(task) {
            let tasks = []
            if (Array.isArray(task)) {
                tasks = task
            } else {
                tasks.push(task)
            }

            tasks.forEach((_task) => {
                if (typeof _task === "function") {
                    this.beforeInit.push(_task)
                }
            })
        }

        getThisContext() {
            return this
        }

        bindSelf(self) {
            const keys = Object.keys(self)

            keys.forEach((key) => {
                if (typeof self[key] === "function") {
                    self[key] = self[key].bind(this)
                }

                this[key] = self[key]
            })
        }

        appendToApp = (key, method) => {
            this.app[key] = method
        }
    }
}

function createEviteApp(context) {
    return class extends classAggregation(React.Component, getEviteConstructor(context)) {
        constructor(props) {
            super(props)

            // set events
            this.eventBus.on("app_init", async () => {
                this.toogleLoading(true)
            })

            this.eventBus.on("app_load_done", async () => {
                this.toogleLoading(false)
            })

            this.appendToApp("about", {

            })
        }

        toogleLoading = (to) => {
            if (typeof to !== "boolean") {
                to = !this.loading
            }

            if (typeof this.handleLoading === "function") {
                this.handleLoading(to)
            }

            this.loading = to
        }

        _init = async () => {
            this.eventBus.emit("app_init")

            //* preload tasks
            if (this.builtInEvents !== null) {
                objectToArrayMap(this.builtInEvents).forEach((event) => {
                    this.eventBus.on(event.key, event.value)
                })
            }

            if (Array.isArray(this.beforeInit)) {
                for await (let task of this.beforeInit) {
                    if (typeof task === "function") {
                        await task(this)
                    }
                }
            }

            await this.initialization()

            this.eventBus.emit("app_load_done")
        }
    }
}

function appendMethodToApp(key, fn, ...args) {
    if (typeof window[key] !== "undefined") {
        throw new Error(`${key} already exists`)
    }

    if (typeof fn !== "function") {
        throw new Error(`${key} must be a function`)
    }

    return (window.app[key] = () => {
        return fn(...args)
    })
}

const GlobalBindingProvider = (props) => {
    const context = {}

    objectToArrayMap(props).forEach((prop) => {
        if (prop.key === "children") {
            return false
        }

        if (typeof prop.value === "function") {
            prop.value = prop.value()
        }

        context[prop.key] = prop.value
    })

    if (Array.isArray(props.children)) {
        return props.children.map((children) => {
            return React.cloneElement(children, { ...context })
        })
    }

    return React.cloneElement(props.children, { ...context })
}

export default createEviteApp

export {
    EventBus,
    classAggregation,
    createEviteApp,
    GlobalBindingProvider,
    appendMethodToApp
}