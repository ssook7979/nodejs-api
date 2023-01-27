"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class EmailException {
    constructor() {
        this.message = 'email_failure';
        this.status = 502;
    }
}
exports.default = EmailException;
