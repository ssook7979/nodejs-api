"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class ForbiddenException {
    constructor() {
        this.status = 403;
        this.message = 'inactive_authentication_failure';
    }
}
exports.default = ForbiddenException;
