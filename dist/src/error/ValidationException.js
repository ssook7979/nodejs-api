"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class ValidationExceptinon {
    constructor(errors) {
        this.status = 400;
        this.errors = errors;
        this.message = 'validation_failure';
    }
}
exports.default = ValidationExceptinon;
