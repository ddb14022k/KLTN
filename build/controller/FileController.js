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
exports.FileControler = void 0;
const constants_1 = require("../common/constants");
const FileDao_1 = require("../Dao/FileDao");
const File_1 = require("../validations/File");
const fs_1 = require("fs");
const functions_1 = require("../common/functions");
class FileControler {
    constructor() {
        this.FileDao = new FileDao_1.FileDao();
        this.getIconById = this.getIconById.bind(this);
        this.insertIcon = this.insertIcon.bind(this);
    }
    getIconById(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { id } = req.params;
                const result = yield this.FileDao.getIconById(id);
                res.json({ icon: result });
            }
            catch (e) {
                res.json({ icon: null });
            }
        });
    }
    validateIcon(req, res, next) {
        return __awaiter(this, void 0, void 0, function* () {
            const { blocksOfWidth, blocksOfHeight, width, height, totalFrames, categoryCd, } = req.body;
            try {
                yield File_1.createIconSchema.validate({
                    blocksOfWidth,
                    blocksOfHeight,
                    width,
                    height,
                    totalFrames,
                    categoryCd,
                }, {
                    abortEarly: false,
                });
                next();
            }
            catch (error) {
                const image = req === null || req === void 0 ? void 0 : req.files;
                if (req.iconInfo) {
                    const segment = req.iconInfo[0].imgLink.split("/");
                    (0, fs_1.unlinkSync)(`./assets/icon/${segment[segment.length - 1]}`);
                }
                (0, functions_1.throwValidateError)(error, next);
            }
        });
    }
    insertIcon(req, res, next) {
        return __awaiter(this, void 0, void 0, function* () {
            const { url, blocksOfWidth, blocksOfHeight, width, height, totalFrames, categoryCd, } = req.body;
            if (!!req.iconInfo) {
                try {
                    const result = yield this.FileDao.createIcon({
                        url: req.iconInfo[0].imgLink,
                        blocksOfWidth,
                        blocksOfHeight,
                        width,
                        height,
                        totalFrames,
                        categoryCd,
                    });
                    res.status(constants_1.REQUEST_SUCCESS).json({ message: "Created" });
                }
                catch (e) {
                    (0, functions_1.throwHttpError)(constants_1.DB_ERROR, constants_1.BAD_REQUEST, next);
                }
            }
            else {
                (0, functions_1.throwNormalError)("Image required", next);
            }
        });
    }
}
exports.FileControler = FileControler;