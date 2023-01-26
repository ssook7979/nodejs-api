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
Object.defineProperty(exports, "__esModule", { value: true });
const app_1 = require("./src/app");
const database_1 = require("./src/config/database");
const User_1 = require("./src/user/User");
const bcrypt_1 = require("bcrypt");
const addUsers = (activeUserCount, inactiveUserCount = 0) => __awaiter(void 0, void 0, void 0, function* () {
    const hash = yield (0, bcrypt_1.hash)('P4ssword', 10);
    for (let i = 0; i < activeUserCount + inactiveUserCount; i++) {
        yield (0, User_1.create)({
            username: `user${i + 1}`,
            email: `user${i + 1}@mail.com`,
            inactive: i >= activeUserCount,
            password: hash,
        });
    }
});
(0, database_1.sync)({ force: true }).then(() => __awaiter(void 0, void 0, void 0, function* () {
    yield addUsers(25);
}));
app_1.app.listen(3000, () => console.log('app is running.'));
