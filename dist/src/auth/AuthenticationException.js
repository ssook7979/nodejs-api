"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class AuthenticationException {
    constructor() {
        this.status = 401;
        this.message = 'authentication_failure';
    }
}
exports.default = AuthenticationException;
