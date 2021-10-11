"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConversationDao = void 0;
const BaseDao_1 = require("./BaseDao");
const constants_1 = require("../common/constants");
class ConversationDao extends BaseDao_1.BaseDao {
    constructor() {
        super();
    }
    addNewGroupConversation(title, creator) {
        return new Promise((resolve, reject) => {
            this.db.query(`INSERT INTO conversation(title,type,createAt,creator) VALUES(?,${constants_1.CONVERSATION_TYPE.GROUP},now(),?)`, [title, creator], (err, result) => {
                if (err)
                    reject(err);
                resolve(result);
            });
        });
    }
    addNewPrivateConversation(creator) {
        return new Promise((resolve, reject) => {
            this.db.query(`INSERT INTO conversation(type,createAt,creator) VALUES(${constants_1.CONVERSATION_TYPE.SINGLE},now(),?)`, [creator], (err, result) => {
                if (err)
                    reject(err);
                resolve(result);
            });
        });
    }
    getConversationByUser(id_user) {
        return new Promise((resolve, reject) => {
            this.db.query(`SELECT conversation.*,
user.email as creator_email,user.avatar as creator_avatar,user.phone as creator_phone 
FROM user_in_conversation 
INNER JOIN conversation ON user_in_conversation.id_room=conversation.id_room 
INNER JOIN user ON conversation.creator=user.id_user
WHERE conversation.delFlag=${constants_1.DEL_FLAG.VALID} AND (user_in_conversation.id_user=?
OR user_in_conversation.id_user=?)`, [id_user, id_user], (err, result) => {
                if (err)
                    reject(err);
                else {
                    resolve(result);
                }
            });
        });
    }
}
exports.ConversationDao = ConversationDao;