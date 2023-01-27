"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class InvalidTokenException {
    constructor() {
        this.message = 'user_not_found';
        this.status = 404;
    }
}
exports.default = InvalidTokenException;
