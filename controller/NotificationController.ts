import { NextFunction, Response, Request } from "express";
import { Notification } from "../models/Notification";
import { NotificationDao } from "../Dao/NotificationDao";
import { CreateNotificationSchema } from "../validations/Notification";
import { throwHttpError, throwValidateError } from "../common/functions";
import {
  BAD_REQUEST,
  DB_ERROR,
  NOTIFICATION_TYPE,
  SOCKET_LIST,
  SOCKET_NAMESPACE,
  SOCKET_PREFIX,
  NOTIFICATION_STATUS,
} from "../common/constants";
import { DecodedUser, IUserWithFriendshipStatus } from "../models/User";
import { Maybe } from "yup/lib/types";
import { OkPacket } from "mysql";
import { NotificationSocketActions } from "../socket/NotificationSocket/actions";
import { Namespace } from "socket.io";
import { UserDao } from "../Dao/UserDao";
import logger from "../common/logger";

export class NotificationController {
  private notificationDao: NotificationDao;
  private userDao: UserDao;
  constructor() {
    this.notificationDao = new NotificationDao();
    this.userDao = new UserDao();

    this.insertNewNotification = this.insertNewNotification.bind(this);
    this.getAllNotificationByUser = this.getAllNotificationByUser.bind(this);
    this.getConversationById = this.getConversationById.bind(this);
    this.answerFriendRequest = this.answerFriendRequest.bind(this);
  }

  public async getAllNotificationByUser(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    const userInfo = res.locals.decodeToken;
    try {
      const result = await this.notificationDao.getAllNotificationByUser(
        userInfo.id_user.toString()
      );
      res.json({ data: result });
    } catch (err) {
      throwHttpError(DB_ERROR, BAD_REQUEST, next);
    }
  }

  public async insertNewNotification(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    const { type, id_receiver, message = null } = req.body;
    const userInfo: DecodedUser = res.locals.decodeToken;
    try {
      const isValid = await CreateNotificationSchema.validate({
        type,
        id_receiver,
      });
    } catch (err: any) {
      throwValidateError(err, next);
      return;
    }
    try {
      const notificationSocket: Namespace =
        req.app.get(SOCKET_LIST) &&
        req.app.get(SOCKET_LIST)[SOCKET_NAMESPACE.NOTIFICATION];
      if (!notificationSocket) {
        throwHttpError("Something wrong", BAD_REQUEST, next);
        return;
      }

      switch (parseInt((type as string).toString())) {
        case NOTIFICATION_TYPE.FRIEND_REQUEST:
          this.insertFriendRequest(
            res,
            next,
            notificationSocket,
            id_receiver,
            userInfo,
            message
          );
          break;

        default:
          res
            .status(BAD_REQUEST)
            .json({ message: "Server is working on that type" });
      }
    } catch (e) {
      throwHttpError("Something wrong", BAD_REQUEST, next);
    }
  }

  public async getConversationById(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    const id = req.params.id || "";
    const userInfo: DecodedUser = res.locals.decodeToken;

    try {
      const result = await this.notificationDao.getSpecificNotification(
        userInfo.id_user.toString(),
        id
      );
      res.json({ data: result });
    } catch (err) {
      throwHttpError(DB_ERROR, BAD_REQUEST, next);
    }
  }

  public async answerFriendRequest(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    const userInfo: DecodedUser = res.locals.decodeToken;
    const { status, id_notification = "", id_sender = "" } = req.body;

    const notificationSocket: Namespace =
      req.app.get(SOCKET_LIST) &&
      req.app.get(SOCKET_LIST)[SOCKET_NAMESPACE.NOTIFICATION];
    if (!notificationSocket) {
      throwHttpError("Something wrong", BAD_REQUEST, next);
    }

    if (
      status.toString() !== NOTIFICATION_STATUS.FULFILLED.toString() &&
      status.toString() !== NOTIFICATION_STATUS.REJECT.toString()
    ) {
      res.status(BAD_REQUEST).json({ message: "BAD REQUEST" });
    }
    try {
      const result: OkPacket = await this.notificationDao.answerFriendRequest(
        userInfo.id_user.toString(),
        id_sender,
        id_notification,
        status.toString()
      );

      if (result.affectedRows === 0) {
        res.status(BAD_REQUEST).json({ message: "Something wrong" });
        return;
      }

      const receiverInfo: IUserWithFriendshipStatus | null =
        await this.userDao.getUserInfoById(
          userInfo.id_user.toString(),
          id_sender
        );

      const senderInfo: IUserWithFriendshipStatus | null =
        await this.userDao.getUserInfoById(
          id_sender,
          userInfo.id_user.toString()
        );

      if (!receiverInfo || !senderInfo) {
        res.status(BAD_REQUEST).json({ message: "Something wrong" });
        return;
      } else {
        res.json({ message: "Success" });

        // Send to sender
        NotificationSocketActions.emitNotification(
          notificationSocket,
          SOCKET_PREFIX.NOTIFICATION + id_sender,
          {
            id_owner: userInfo.id_user,
            type: NOTIFICATION_TYPE.ACCEPT_FRIEND_REQUEST,
            createAt: new Date().toISOString(),
            data: {
              user: senderInfo,
            },
          }
        );
        // Send to current user
        NotificationSocketActions.emitNotification(
          notificationSocket,
          SOCKET_PREFIX.NOTIFICATION + userInfo.id_user,
          {
            id_owner: userInfo.id_user,
            type: NOTIFICATION_TYPE.ACCEPT_FRIEND_REQUEST,
            createAt: new Date().toISOString(),
            data: {
              user: receiverInfo,
            },
          }
        );
      }
    } catch (err) {
      console.log(err);      
      throwHttpError(DB_ERROR, BAD_REQUEST, next);
    }
  }

  private async insertFriendRequest(
    res: Response,
    next: NextFunction,
    notificationNamespace: Namespace,
    id_receiver: string,
    userInfo: DecodedUser,
    message: Maybe<string>
  ) {
    try {
      const result: OkPacket =
        await this.notificationDao.insertNewFriendRequestNotification({
          id_receiver,
          id_owner: userInfo.id_user.toString(),
          message: message || "",
        });
console.log("daadada");
      NotificationSocketActions.emitNotification(
        notificationNamespace,
        SOCKET_PREFIX.NOTIFICATION + id_receiver,
        {
          id_owner: userInfo.id_user,
          type: NOTIFICATION_TYPE.FRIEND_REQUEST,
          createAt: new Date().toISOString(),
          data: {
            idNotifcation: result.insertId,
            message,
          },
        }
      );
res.json({message:"Ok"});

    } catch (err) {
      throwHttpError(DB_ERROR, BAD_REQUEST, next);
    }
  }
}
