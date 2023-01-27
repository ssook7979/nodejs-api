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
const express_1 = __importDefault(require("express"));
const bcrypt_1 = __importDefault(require("bcrypt"));
const AuthenticationException_1 = __importDefault(require("./AuthenticationException"));
const ForbiddenException_1 = __importDefault(require("./ForbiddenException"));
const express_validator_1 = require("express-validator");
const UserService_1 = require("../user/UserService");
const router = express_1.default.Router();
router.post('/api/1.0/auth', (0, express_validator_1.check)('email').isEmail(), (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    const errors = (0, express_validator_1.validationResult)(req);
    if (!errors.isEmpty()) {
        return next(new AuthenticationException_1.default());
    }
    const { email, password } = req.body;
    const user = yield (0, UserService_1.findByEmail)(email);
    if (!user) {
        return next(new AuthenticationException_1.default());
    }
    const match = yield bcrypt_1.default.compare(password, user.password);
    if (!match) {
        return next(new AuthenticationException_1.default());
    }
    if (user.inactive) {
        return next(new ForbiddenException_1.default());
    }
    res.send({ id: user.id, username: user.username });
}));
exports.default = router;
