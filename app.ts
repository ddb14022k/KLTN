import express, { Express, NextFunction, Request } from "express";
import { Server as SocketServer, Socket } from "socket.io";
import http, { Server, IncomingHttpHeaders } from "http";
import uploadRouter from "./router/uploadFileRouter";
import authenticationRouter from "./router/authenticate";
import conversationRouter from "./router/conversationRouter";
import userRouter from "./router/userRouter";
import messageRouter from "./router/messageRouter";
import notifcationRouter from "./router/notificationRouter";
import multer from "multer";
const bodyParser = require("body-parser");
import cors from "cors";
import path from "path";
import { unlinkSync } from "fs";
import { HttpError } from "./models/HttpError";
import { CustomValidationError } from "./models/CustomValidationError";
import logger from "./common/logger";
import { getCount } from "./apb";
import {
  UNAUTHORIZED,
  INTERNAL_SERVER,
  BAD_REQUEST,
  SOCKET_EMIT_ACTIONS,
  SOCKET_NAMESPACE,
  SOCKET_ON_ACTIONS,
  SOCKET_LIST,
} from "./common/constants";

// import { socketVerifyToken } from "./middlewares/authenticate";
import { socketManager, SocketWithoutAuthenticate } from "./socket";
import jwt from "jsonwebtoken";
import { bindSocketData } from "./middlewares/authenticate";
const app: Express = express();
app.use(cors());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "assets")));
app.use(bodyParser.json());
app.set(SOCKET_LIST, null);
require("dotenv").config();
const server: Server = http.createServer(app);

const io = new SocketServer(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
  },
  transports: ["websocket"],
});
// io.engine.on("headers", (headers:IncomingHttpHeaders, req:Request) => {
//     headers["test"] = "789";
//   });

// io.engine.on("initial_headers", (headers:IncomingHttpHeaders, req:Request) => {
//     headers["test"] = "123";
//     headers["set-cookie"] = ["mycookie=456"];
//   });

// io.use(socketVerifyToken);

// io.of("/TEST").on("connection",(socket:Socket)=>{
//   console.log("d",getCount());
// })

SocketWithoutAuthenticate(io);

io.sockets.on("connection", (socket: Socket) => {
  console.log("connect");

  // const socketList = io._nsps.forEach((nsp) => {
  //   nsp.on("connect", function (socket) {
  //     jwt.verify(
  //       (socket.data.decode as string) || "",
  //       process.env.TOKEN_SECRET as string,
  //       (err: any, decode: any) => {
  //         if (err) {
  //           // nsp._remove(socket);
  //           // nsp.sockets.delete(socket.id);
  //         } else {
  //           // delete
  //         }
  //       }
  //     );
  //   });
  // });
  console.log("client connected");

  socket.once(SOCKET_ON_ACTIONS.ON_AUTHENTICATE, (data) => {
    jwt.verify(
      data.token,
      process.env.TOKEN_SECRET as string,
      (err: any, decode: any) => {
        if (err) {
          //   console.log(err);
          app.set(SOCKET_LIST, null);
          socket.emit(SOCKET_EMIT_ACTIONS.AUTHEN_FAIL);
          socket.disconnect();
        } else {
          socket.data.decode = decode;
          console.log("decode");
          io._nsps.forEach((nsp) => {
            nsp.sockets.forEach((_socket) => {
              if (_socket.id === socket.id) nsp.sockets.set(socket.id, socket);
            });
          });
          socket.emit(SOCKET_EMIT_ACTIONS.AUTHEN_SUCCESS);
          const socketList = socketManager(io, socket.data.decode);
          app.set(SOCKET_LIST, socketList);
        }
      }
    );
  });

  // if socket didnt authenticate just disconnect it else call another socket with parse info
//   setTimeout(() => {
//     if (socket.data.decode) {
//       console.log("authen");
//       socket.emit(SOCKET_EMIT_ACTIONS.AUTHEN_SUCCESS);
//       const socketList = socketManager(io, socket.data.decode);
//       app.set(SOCKET_LIST, socketList);
//     } else {
//       app.set(SOCKET_LIST, null);
//       socket.emit(SOCKET_EMIT_ACTIONS.AUTHEN_FAIL);
//       socket.disconnect();
//     }
//   }, 3000);
});

app.use("/upload", uploadRouter);
app.use("/authen", authenticationRouter);
app.use("/user", userRouter);
app.use("/conversation", conversationRouter);
app.use("/message", messageRouter);
app.use("/notification", notifcationRouter);
// localhost:300/authen/signup

app.get("/cook", (req, res) => {
  res.cookie("cook", "hyy").json({ name: req.hostname });
});

// Error handle
app.use(
  (
    err: Error | CustomValidationError | HttpError,
    req: express.Request,
    res: express.Response,
    next: express.NextFunction
  ) => {
    logger.err(err, true);
    if (err instanceof HttpError) {
      res.status(err.status | BAD_REQUEST).json({
        message: err.message,
      });
    } else if (err instanceof CustomValidationError) {
      console.log(err);
      res.status(err.status | INTERNAL_SERVER).json({
        message: err.message,
        errors: err,
      });
    } else {
      res.status(BAD_REQUEST).json({
        message: err.message || "Unexpected error",
      });
    }
  }
);

server.listen(process.env.PORT || 3001, () => {
  console.log("Hello world", process.env.PORT);
});
// mysqldump --column-statistics=0 --routines -u root -p  chat_app > filename.sql
