"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class InvalidTokenException {
    constructor() {
        this.message = 'account_activation_failure';
        this.status = 400;
    }
}
exports.default = InvalidTokenException;
