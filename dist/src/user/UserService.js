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
exports.getUser = exports.getUsers = exports.activate = exports.findByEmail = exports.save = void 0;
const User_1 = __importDefault(require("./User"));
const bcrypt_1 = require("bcrypt");
const crypto_1 = require("crypto");
const EmailService_1 = require("../email/EmailService");
const database_1 = __importDefault(require("../config/database"));
const EmailException_1 = __importDefault(require("../email/EmailException"));
const InvalidTokenException_1 = __importDefault(require("./InvalidTokenException"));
const UserNotFoundException_1 = __importDefault(require("./UserNotFoundException"));
const generateToken = (length) => {
    return (0, crypto_1.randomBytes)(length).toString('hex').substring(0, length);
};
const save = (body) => __awaiter(void 0, void 0, void 0, function* () {
    const { username, email, password } = body;
    const hash = yield (0, bcrypt_1.hash)(password || '', 10);
    const user = {
        username,
        email,
        password: hash,
        activationToken: generateToken(10),
    };
    const transaction = yield database_1.default.transaction();
    yield User_1.default.create(user, { transaction });
    try {
        yield (0, EmailService_1.sendAccountActivation)(email || '', user.activationToken || '');
        transaction.commit();
    }
    catch (err) {
        yield transaction.rollback();
        throw new EmailException_1.default();
    }
});
exports.save = save;
const findByEmail = (email) => __awaiter(void 0, void 0, void 0, function* () {
    return yield User_1.default.findOne({ where: { email } });
});
exports.findByEmail = findByEmail;
const activate = (token) => __awaiter(void 0, void 0, void 0, function* () {
    const user = yield User_1.default.findOne({ where: { activationToken: token } });
    if (!user) {
        throw new InvalidTokenException_1.default();
    }
    user.inactive = false;
    user.activationToken = null;
    yield user.save();
});
exports.activate = activate;
const getUsers = (page, size) => __awaiter(void 0, void 0, void 0, function* () {
    const usersWithCount = yield User_1.default.findAndCountAll({
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
exports.getUsers = getUsers;
const getUser = (id) => __awaiter(void 0, void 0, void 0, function* () {
    const user = yield User_1.default.findOne({
        where: { id, inactive: false },
        attributes: ['id', 'username', 'email'],
    });
    if (!user) {
        throw new UserNotFoundException_1.default();
    }
    return user;
});
exports.getUser = getUser;
