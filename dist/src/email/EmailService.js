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
exports.sendAccountActivation = void 0;
const nodemailer_1 = __importDefault(require("nodemailer"));
const emailTransporter_1 = __importDefault(require("../config/emailTransporter"));
const sendAccountActivation = (email, token) => __awaiter(void 0, void 0, void 0, function* () {
    const info = yield emailTransporter_1.default.sendMail({
        from: 'My App <info@my-app.com>',
        to: email,
        subject: 'Account Activation',
        html: `
    <div>
      <b>Please click below link to activate your account.</b>
    </div>
    <div>
      <a href="http://localhost:8080/#/login?token=${token}"></a>
    </div>
    `,
    });
    if (process.env.NODE_ENV === 'development') {
        console.log('url: ' + nodemailer_1.default.getTestMessageUrl(info));
    }
});
exports.sendAccountActivation = sendAccountActivation;
