"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importStar(require("express"));
const i18next_http_middleware_1 = require("i18next-http-middleware");
const UserRouter_1 = __importDefault(require("./user/UserRouter"));
const AuthenticationRouter_1 = __importDefault(require("./auth/AuthenticationRouter"));
const ErrorHandler_1 = __importDefault(require("./error/ErrorHandler"));
const i18next_1 = __importDefault(require("i18next"));
const i18next_fs_backend_1 = __importDefault(require("i18next-fs-backend"));
const i18next_http_middleware_2 = require("i18next-http-middleware");
i18next_1.default
    .use(i18next_fs_backend_1.default)
    .use(i18next_http_middleware_2.LanguageDetector)
    .init({
    fallbackLng: 'en',
    lng: 'en',
    ns: ['translation'],
    defaultNS: 'translation',
    backend: {
        loadPath: './locales/{{lng}}/{{ns}}.js',
    },
    detection: {
        lookupHeader: 'accept-language',
    },
});
const app = (0, express_1.default)();
app.use((0, i18next_http_middleware_1.handle)(i18next_1.default));
app.use((0, express_1.json)());
app.use(UserRouter_1.default);
app.use(AuthenticationRouter_1.default);
app.use(ErrorHandler_1.default);
console.log('env: ' + process.env.NODE_ENV);
exports.default = app;
