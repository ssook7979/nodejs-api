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
const User_1 = require("./User");
const bcrypt_1 = require("bcrypt");
const crypto_1 = require("crypto");
const EmailService_1 = require("../email/EmailService");
const database_1 = require("../config/database");
const EmailException_1 = __importDefault(require("../email/EmailException"));
const InvalidTokenException_1 = __importDefault(require("./InvalidTokenException"));
const UserNotFoundException_1 = __importDefault(require("./UserNotFoundException"));
const generateToken = (length) => {
    return (0, crypto_1.randomBytes)(length).toString('hex').substring(0, length);
};
const save = (body) => __awaiter(void 0, void 0, void 0, function* () {
    const { username, email, password } = body;
    const hash = yield (0, bcrypt_1.hash)(password, 10);
    const user = {
        username,
        email,
        password: hash,
        activationToken: generateToken(10),
    };
    const transaction = yield (0, database_1.transaction)();
    yield (0, User_1.create)(user, { transaction });
    try {
        yield (0, EmailService_1.sendAccountActivation)(email, user.activationToken);
        transaction.commit();
    }
    catch (err) {
        yield transaction.rollback();
        throw new EmailException_1.default(err);
    }
});
const findByEmail = (email) => __awaiter(void 0, void 0, void 0, function* () {
    return yield (0, User_1.findOne)({ where: { email } });
});
const activate = (token) => __awaiter(void 0, void 0, void 0, function* () {
    const user = yield (0, User_1.findOne)({ where: { activationToken: token } });
    if (!user) {
        throw new InvalidTokenException_1.default();
    }
    user.inactive = false;
    user.activationToken = null;
    yield user.save();
});
const getUsers = (page, size) => __awaiter(void 0, void 0, void 0, function* () {
    const usersWithCount = yield (0, User_1.findAndCountAll)({
        where: { inactive: false },
        attributes: ['id', 'username', 'email'],
        limit: size,
        offset: page * size,
    });
    return {
        content: usersWithCount.rows,
        page,
        size,
        totalPages: Math.ceil(usersWithCount.count / size),
    };
});
const getUser = (id) => __awaiter(void 0, void 0, void 0, function* () {
    const user = yield (0, User_1.findOne)({
        where: { id, inactive: false },
        attributes: ['id', 'username', 'email'],
    });
    if (!user) {
        throw new UserNotFoundException_1.default();
    }
    return user;
});
exports.default = { save, findByEmail, activate, getUsers, getUser };
