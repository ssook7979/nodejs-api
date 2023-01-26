"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const UserService_1 = require("./UserService");
const express_validator_1 = require("express-validator");
const ValidationException_1 = __importDefault(require("../error/ValidationException"));
const pagination_1 = __importDefault(require("../middleware/pagination"));
const router = (0, express_1.Router)();
router.post('/api/1.0/users', (0, express_validator_1.check)('username')
    .notEmpty()
    .withMessage('username_null')
    .bail()
    .isLength({ min: 4 })
    .withMessage('username_size'), (0, express_validator_1.check)('password')
    .notEmpty()
    .withMessage('password_null')
    .bail()
    .isLength({ min: 6 })
    .withMessage('password_size')
    .bail()
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).*$/)
    .withMessage('password_invalid'), (0, express_validator_1.check)('email')
    .notEmpty()
    .withMessage('email_null')
    .bail()
    .isEmail()
    .withMessage('email_invalid')
    .bail()
    .custom((email) => __awaiter(void 0, void 0, void 0, function* () {
    const user = yield (0, UserService_1.findByEmail)(email);
    if (user) {
        throw new Error('email_in_use');
    }
    return true;
})), (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    const errors = (0, express_validator_1.validationResult)(req);
    if (!errors.isEmpty()) {
        const validationErrors = {};
        errors.array().forEach((error) => {
            validationErrors[error.param] = req.t(error.msg);
        });
        return next(new ValidationException_1.default(errors.array()));
    }
    try {
        yield (0, UserService_1.save)(req.body);
        return res.send({ message: req.t('user_create_success') });
    }
    catch (err) {
        next(err);
    }
}));
router.post('/api/1.0/users/token/:token', (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    const token = req.params.token;
    try {
        yield (0, UserService_1.activate)(token);
        res.send({ message: req.t('account_activation_success') });
    }
    catch (err) {
        next(err);
    }
}));
router.get('/api/1.0/users', pagination_1.default, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { page, size } = req.pagination;
    const users = yield (0, UserService_1.getUsers)(page, size);
    res.send(users);
}));
router.get('/api/1.0/users/:id', (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const user = yield (0, UserService_1.getUser)(parseInt(req.params.id));
        res.send(user);
    }
    catch (err) {
        next(err);
    }
}));
exports.default = router;
