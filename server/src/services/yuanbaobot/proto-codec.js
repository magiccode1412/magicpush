const protobuf = require('protobufjs');
const logger = require('../../utils/logger');

// ── Protobuf JSON 描述符 (从官方 yuanbao-openclaw-plugin 提取) ────
const CONN_PROTO_JSON = {
  "options": { "syntax": "proto3" },
  "nested": {
    "trpc": {
      "nested": {
        "yuanbao": {
          "nested": {
            "conn_common": {
              "nested": {
                "RetCode": {
                  "values": {
                    "SUCCESS": 0, "PARAMS_INVALID": 40011, "AUTH_FAIL": 40100,
                    "UNKNOWN_ROUTE": 40300, "ALREADY_AUTH": 41101,
                    "SAME_KIND_DEV_LOGIN": 41102, "AUTH_TOKEN_INVALID": 41103,
                    "AUTH_TOKEN_EXPIRED": 41104, "AUTH_USER_NOT_REGISTERED": 41105,
                    "AUTH_USER_FORBIDDEN": 41106, "AUTH_USER_UNQUALIFIED": 41107,
                    "AUTH_TOKEN_FORCED_EXPIRATION": 41108, "PROHIBIT_APP_VERSION": 41109,
                    "PACKAGE_SIGN_ILLEGAL": 41110, "INNER_SVR_FAIL": 50400,
                    "OVERLOAD_CONTROL": 50503, "SET_STATE_CONFLICT": 51001,
                    "CONN_OVER_LIMIT": 51002, "NO_USER_ONLINE": 51003,
                    "PARTIAL_FAIL": 51004, "NET_FAIL": 90001,
                    "BACKEND_RETURN_FAIL": 90003, "USER_OFFLINE": 20001, "USER_NOT_EXIST": 20002
                  }
                },
                "HeadMeta": { "fields": { "key": { "type": "string", "id": 1 }, "value": { "type": "string", "id": 2 } } },
                "Head": {
                  "fields": {
                    "cmdType": { "type": "uint32", "id": 1 },
                    "cmd": { "type": "string", "id": 2 },
                    "seqNo": { "type": "uint32", "id": 3 },
                    "msgId": { "type": "string", "id": 4 },
                    "module": { "type": "string", "id": 5 },
                    "needAck": { "type": "bool", "id": 6 },
                    "meta": { "rule": "repeated", "type": "HeadMeta", "id": 7 },
                    "status": { "type": "int32", "id": 10 }
                  }
                },
                "ConnMsg": { "fields": { "head": { "type": "Head", "id": 1 }, "data": { "type": "bytes", "id": 2 } } },
                "DirectedPush": { "fields": { "type": { "type": "uint32", "id": 1 }, "content": { "type": "string", "id": 2 } } },
                "AuthInfo": { "fields": { "uid": { "type": "string", "id": 1 }, "source": { "type": "string", "id": 2 }, "token": { "type": "string", "id": 3 } } },
                "DeviceInfo": {
                  "fields": {
                    "appVersion": { "type": "string", "id": 1 }, "appOperationSystem": { "type": "string", "id": 2 },
                    "appBundleId": { "type": "string", "id": 3 }, "qimei": { "type": "string", "id": 4 },
                    "qimei36": { "type": "string", "id": 5 }, "h38": { "type": "string", "id": 6 },
                    "language": { "type": "string", "id": 7 }, "deviceId": { "type": "string", "id": 8 },
                    "deviceName": { "type": "string", "id": 9 }, "instanceId": { "type": "string", "id": 10 },
                    "tid": { "type": "string", "id": 11 }, "uskey": { "type": "string", "id": 12 },
                    "busParamsMd5": { "type": "string", "id": 13 }, "packageType": { "type": "string", "id": 14 },
                    "appPublishChannel": { "type": "string", "id": 15 }, "signVersion": { "type": "string", "id": 16 },
                    "packageSignature": { "type": "string", "id": 17 }, "brand": { "type": "string", "id": 18 },
                    "h42": { "type": "string", "id": 19 }, "xDeviceId": { "type": "string", "id": 20 },
                    "xPlatform": { "type": "string", "id": 21 }, "dialToken": { "type": "string", "id": 22 },
                    "qimei36Token": { "type": "string", "id": 23 }, "botVersion": { "type": "string", "id": 24 }
                  }
                },
                "Container": { "fields": { "type": { "type": "int32", "id": 1 }, "uniqueKey": { "type": "string", "id": 2 } } },
                "AuthBindReq": {
                  "fields": {
                    "bizId": { "type": "string", "id": 1 }, "authInfo": { "type": "AuthInfo", "id": 2 },
                    "deviceInfo": { "type": "DeviceInfo", "id": 3 }, "containerInfo": { "type": "Container", "id": 4 },
                    "envName": { "type": "string", "id": 5 }, "bindMode": { "type": "uint32", "id": 6 },
                    "forceToken": { "type": "string", "id": 7 }
                  }
                },
                "AuthBindRsp": {
                  "fields": {
                    "code": { "type": "int32", "id": 1 }, "message": { "type": "string", "id": 2 },
                    "connectId": { "type": "string", "id": 3 }, "timestamp": { "type": "uint64", "id": 4 },
                    "clientIp": { "type": "string", "id": 5 }
                  }
                },
                "PingReq": { "fields": {} },
                "PingRsp": { "fields": { "heartInterval": { "type": "uint32", "id": 1 }, "timestamp": { "type": "uint64", "id": 2 } } },
                "KickoutMsg": { "fields": { "status": { "type": "int32", "id": 1 }, "reason": { "type": "string", "id": 2 }, "otherDeviceName": { "type": "string", "id": 3 } } },
                "Meta": { "fields": { "key": { "type": "string", "id": 1 }, "value": { "type": "string", "id": 2 } } },
                "UpdateMetaReq": { "fields": { "metaInfos": { "rule": "repeated", "type": "Meta", "id": 1 } } },
                "UpdateMetaRsp": { "fields": { "code": { "type": "int32", "id": 1 }, "message": { "type": "string", "id": 2 } } },
                "PushMsg": { "fields": { "cmd": { "type": "string", "id": 1 }, "module": { "type": "string", "id": 2 }, "msgId": { "type": "string", "id": 3 }, "data": { "type": "bytes", "id": 4 } } }
              }
            }
          }
        }
      }
    }
  }
};

const BIZ_PROTO_JSON = {
  "options": { "syntax": "proto3" },
  "nested": {
    "trpc": {
      "nested": {
        "yuanbao": {
          "nested": {
            "yuanbao_conn": {
              "nested": {
                "yuanbao_openclaw_proxy": {
                  "nested": {
                    "ImMsgSeq": { "fields": { "msgSeq": { "type": "uint64", "id": 1 }, "msgId": { "type": "string", "id": 2 } } },
                    "ImImageInfoArray": { "fields": { "type": { "type": "uint32", "id": 1 }, "size": { "type": "uint32", "id": 2 }, "width": { "type": "uint32", "id": 3 }, "height": { "type": "uint32", "id": 4 }, "url": { "type": "string", "id": 5 } } },
                    "MsgContent": {
                      "fields": {
                        "text": { "type": "string", "id": 1 }, "uuid": { "type": "string", "id": 2 },
                        "imageFormat": { "type": "uint32", "id": 3 }, "data": { "type": "string", "id": 4 },
                        "desc": { "type": "string", "id": 5 }, "ext": { "type": "string", "id": 6 },
                        "sound": { "type": "string", "id": 7 }, "imageInfoArray": { "rule": "repeated", "type": "ImImageInfoArray", "id": 8 },
                        "index": { "type": "uint32", "id": 9 }, "url": { "type": "string", "id": 10 },
                        "fileSize": { "type": "uint32", "id": 11 }, "fileName": { "type": "string", "id": 12 }
                      }
                    },
                    "MsgBodyElement": { "fields": { "msgType": { "type": "string", "id": 1 }, "msgContent": { "type": "MsgContent", "id": 2 } } },
                    "LogInfoExt": { "fields": { "traceId": { "type": "string", "id": 1 } } },
                    "SendC2CMessageReq": {
                      "fields": {
                        "msgId": { "type": "string", "id": 1 }, "toAccount": { "type": "string", "id": 2 },
                        "fromAccount": { "type": "string", "id": 3 }, "msgRandom": { "type": "uint32", "id": 4 },
                        "msgBody": { "rule": "repeated", "type": "MsgBodyElement", "id": 5 },
                        "groupCode": { "type": "string", "id": 6 }, "msgSeq": { "type": "uint64", "id": 7 },
                        "logExt": { "type": "LogInfoExt", "id": 8 }
                      }
                    },
                    "SendC2CMessageRsp": { "fields": { "code": { "type": "int32", "id": 1 }, "message": { "type": "string", "id": 2 } } },
                    "SendGroupMessageReq": {
                      "fields": {
                        "msgId": { "type": "string", "id": 1 }, "groupCode": { "type": "string", "id": 2 },
                        "fromAccount": { "type": "string", "id": 3 }, "toAccount": { "type": "string", "id": 4 },
                        "random": { "type": "string", "id": 5 }, "msgBody": { "rule": "repeated", "type": "MsgBodyElement", "id": 6 },
                        "refMsgId": { "type": "string", "id": 7 }, "msgSeq": { "type": "uint64", "id": 8 },
                        "msgRandom": { "type": "uint32", "id": 9 }, "logExt": { "type": "LogInfoExt", "id": 10 }
                      }
                    },
                    "SendGroupMessageRsp": { "fields": { "code": { "type": "int32", "id": 1 }, "message": { "type": "string", "id": 2 } } },
                    "InboundMessagePush": {
                      "fields": {
                        "callbackCommand": { "type": "string", "id": 1 }, "fromAccount": { "type": "string", "id": 2 },
                        "toAccount": { "type": "string", "id": 3 }, "senderNickname": { "type": "string", "id": 4 },
                        "groupId": { "type": "string", "id": 5 }, "groupCode": { "type": "string", "id": 6 },
                        "groupName": { "type": "string", "id": 7 }, "msgSeq": { "type": "uint32", "id": 8 },
                        "msgRandom": { "type": "uint32", "id": 9 }, "msgTime": { "type": "uint32", "id": 10 },
                        "msgKey": { "type": "string", "id": 11 }, "msgId": { "type": "string", "id": 12 },
                        "msgBody": { "rule": "repeated", "type": "MsgBodyElement", "id": 13 },
                        "cloudCustomData": { "type": "string", "id": 14 }, "eventTime": { "type": "uint32", "id": 15 },
                        "botOwnerId": { "type": "string", "id": 16 },
                        "recallMsgSeqList": { "rule": "repeated", "type": "ImMsgSeq", "id": 17 },
                        "clawMsgType": { "type": "EnumCLawMsgType", "id": 18 },
                        "privateFromGroupCode": { "type": "string", "id": 19 }, "logExt": { "type": "LogInfoExt", "id": 20 }
                      }
                    },
                    "EnumCLawMsgType": { "values": { "CLAW_MSG_UNKNOWN": 0, "CLAW_MSG_GROUP": 1, "CLAW_MSG_PRIVATE": 2 } },
                    "GetGroupMemberListReq": { "fields": { "groupCode": { "type": "string", "id": 1 } } },
                    "GetGroupMemberListRsp": { "fields": { "code": { "type": "int32", "id": 1 }, "message": { "type": "string", "id": 2 }, "memberList": { "rule": "repeated", "type": "Member", "id": 3 } } },
                    "Member": { "fields": { "userId": { "type": "string", "id": 1 }, "nickName": { "type": "string", "id": 2 }, "userType": { "type": "int32", "id": 3 } } },
                    "QueryGroupInfoReq": { "fields": { "groupCode": { "type": "string", "id": 1 } } },
                    "QueryGroupInfoRsp": { "fields": { "code": { "type": "int32", "id": 1 }, "msg": { "type": "string", "id": 2 }, "groupInfo": { "type": "GroupInfo", "id": 3 } } },
                    "GroupInfo": { "fields": { "groupName": { "type": "string", "id": 1 }, "groupOwnerUserId": { "type": "string", "id": 2 }, "groupOwnerNickname": { "type": "string", "id": 3 }, "groupSize": { "type": "int32", "id": 4 } } },
                    "EnumHeartbeat": { "values": { "HEARTBEAT_UNKNOWN": 0, "HEARTBEAT_RUNNING": 1, "HEARTBEAT_FINISH": 2 } },
                    "SyncInformationType": { "values": { "SYNC_INFORMATION_TYPE_UNSPECIFIED": 0, "SYNC_INFORMATION_TYPE_COMMANDS": 1 } },
                    "Command": { "fields": { "name": { "type": "string", "id": 1 }, "description": { "type": "string", "id": 2 } } },
                    "SyncCommandsData": { "fields": { "botCommands": { "rule": "repeated", "type": "Command", "id": 1 }, "pluginCommands": { "rule": "repeated", "type": "Command", "id": 2 } } },
                    "SyncInformationReq": {
                      "oneofs": { "data": { "oneof": ["commandData"] } },
                      "fields": {
                        "syncType": { "type": "SyncInformationType", "id": 1 }, "botVersion": { "type": "string", "id": 2 },
                        "pluginVersion": { "type": "string", "id": 3 }, "commandData": { "type": "SyncCommandsData", "id": 11 }
                      }
                    },
                    "SyncInformationRsp": { "fields": { "code": { "type": "int32", "id": 1 }, "msg": { "type": "string", "id": 2 } } }
                  }
                }
              }
            }
          }
        }
      }
    }
  }
};

// ── 常量 ──────────────────────────────────────────────────────────────

const CMD_TYPE = { Request: 0, Response: 1, Push: 2 };
const CMD = { AuthBind: 'auth-bind', Ping: 'ping', Kickout: 'kickout' };

/** 连接层消息类型 → Proto 类型映射 */
const PB_MSG_TYPES = {
  AuthBindRsp: 'trpc.yuanbao.conn_common.AuthBindRsp',
  PingRsp: 'trpc.yuanbao.conn_common.PingRsp',
  KickoutMsg: 'trpc.yuanbao.conn_common.KickoutMsg',
  PushMsg: 'trpc.yuanbao.conn_common.PushMsg',
  DirectedPush: 'trpc.yuanbao.conn_common.DirectedPush',
};

// ── Root 缓存 (懒加载，全局单例) ─────────────────────────────────────
let _connRoot = null;
let _bizRoot = null;

function getConnRoot() {
  if (!_connRoot) {
    _connRoot = protobuf.Root.fromJSON(CONN_PROTO_JSON);
    logger.info('[yuanbaobot-proto] conn proto root initialized');
  }
  return _connRoot;
}

function getBizRoot() {
  if (!_bizRoot) {
    _bizRoot = protobuf.Root.fromJSON(BIZ_PROTO_JSON);
    logger.info('[yuanbaobot-proto] biz proto root initialized');
  }
  return _bizRoot;
}

// ── 连接层编解码 ──────────────────────────────────────────────────────

/**
 * 编码 ConnMsg (连接层通用信封)
 */
function encodeConnMsg(head, data) {
  const ConnMsg = getConnRoot().lookupType('trpc.yuanbao.conn_common.ConnMsg');
  const errMsg = ConnMsg.verify({ head, data: data || Buffer.alloc(0) });
  if (errMsg) throw new Error(`encodeConnMsg verify failed: ${errMsg}`);
  return ConnMsg.encode({ head, data: data || Buffer.alloc(0) }).finish();
}

/**
 * 解码 ConnMsg → { head, data }
 */
function decodeConnMsg(binary) {
  const ConnMsg = getConnRoot().lookupType('trpc.yuanbao.conn_common.ConnMsg');
  return ConnMsg.decode(binary);
}

/** 连接层模块名 */
const CONN_MODULE = 'conn_access';

/** 递增序列号计数器 */
let _seqNo = 0;
function nextSeqNo() {
  const n = _seqNo++;
  if (_seqNo >= Number.MAX_SAFE_INTEGER) _seqNo = 0;
  return n;
}

/**
 * 构建认证请求二进制
 * @param {{ bizId, authInfo?, deviceInfo?, containerInfo?, envName?, bindMode?, forceToken? }} payload
 */
function buildAuthBindMsg(payload) {
  const root = getConnRoot();
  const AuthBindReq = root.lookupType('trpc.yuanbao.conn_common.AuthBindReq');
  const errMsg = AuthBindReq.verify(payload);
  if (errMsg) throw new Error(`buildAuthBindMsg verify failed: ${errMsg}`);

  const body = AuthBindReq.encode(payload).finish();
  const head = {
    cmdType: CMD_TYPE.Request,
    cmd: CMD.AuthBind,
    module: CONN_MODULE,
    msgId: payload.msgId,
    seqNo: nextSeqNo(),
  };
  return encodeConnMsg(head, body);
}

/**
 * 构建 Ping 请求二进制
 */
function buildPingMsg(msgId) {
  const root = getConnRoot();
  const PingReq = root.lookupType('trpc.yuanbao.conn_common.PingReq');
  const body = PingReq.encode({}).finish();
  const head = {
    cmdType: CMD_TYPE.Request,
    cmd: CMD.Ping,
    module: CONN_MODULE,
    msgId,
    seqNo: nextSeqNo(),
  };
  return encodeConnMsg(head, body);
}

/**
 * 构建 Push ACK 二进制
 */
function buildPushAck(headMsg) {
  // ACK 的 head 中 cmdType=3, 复制原 head 的 cmd/msgId
  return null; // MVP 暂不实现 ACK（服务端非强求）
}

/**
 * 构建业务层请求信封
 */
function buildBusinessConnMsg(cmd, module, data, msgId) {
  const head = {
    cmdType: CMD_TYPE.Request,
    cmd,
    msgId,
    module,
    seqNo: 0,
  };
  return encodeConnMsg(head, data);
}

/**
 * 按 type name 解码连接层数据
 */
function decodePB(typeName, data) {
  try {
    const root = getConnRoot();
    const Type = root.lookupType(typeName);
    if (!Type) return null;
    const errMsg = Type.verify(data);
    if (errMsg) {
      logger.warn(`[yuanbaobot-proto] decodePB verify failed for ${typeName}: ${errMsg}`);
      return null;
    }
    return Type.decode(data);
  } catch (err) {
    logger.warn(`[yuanbaobot-proto] decodePB error for ${typeName}: ${err.message}`);
    return null;
  }
}

// ── 业务层编解码 ──────────────────────────────────────────────────────

/** 业务模块名 */
const BIZ_MODULE = 'yuanbao_openclaw_proxy';

/** 业务层命令 */
const BIZ_CMD = {
  SendC2CMessage: 'send_c2c_message',
  SendGroupMessage: 'send_group_message',
};

/**
 * 编码 C2C 文本发送请求
 * @param {{ msgId, toAccount, fromAccount, text }} params
 */
function encodeSendC2CMessageReq(params) {
  const root = getBizRoot();
  const SendC2CMessageReq = root.lookupType(
    'trpc.yuanbao.yuanbao_conn.yuanbao_openclaw_proxy.SendC2CMessageReq'
  );
  const req = {
    msgId: params.msgId,
    toAccount: params.toAccount,
    fromAccount: params.fromAccount || '',
    groupCode: '',
    msgRandom: 0,
    msgBody: [
      {
        msgType: 'TIMTextElem',
        msgContent: { text: params.text },
      },
    ],
  };
  const errMsg = SendC2CMessageReq.verify(req);
  if (errMsg) throw new Error(`encodeSendC2CMessageReq verify failed: ${errMsg}`);
  return SendC2CMessageReq.encode(req).finish();
}

/**
 * 编码群聊文本发送请求
 *
 * 与 C2C 的区别:
 *   - 用 groupCode 指定目标群（而非 toAccount）
 *   - 额外支持 refMsgId（引用回复）和 random 字段
 *
 * @param {{ msgId, groupCode, fromAccount, text }} params
 */
function encodeSendGroupMessageReq(params) {
  const root = getBizRoot();
  const SendGroupMessageReq = root.lookupType(
    'trpc.yuanbao.yuanbao_conn.yuanbao_openclaw_proxy.SendGroupMessageReq'
  );
  const req = {
    msgId: params.msgId,
    groupCode: params.groupCode,
    fromAccount: params.fromAccount || '',
    toAccount: '',           // 群发消息时为空
    random: String(Math.floor(Math.random() * 1000000000)),
    msgBody: [
      {
        msgType: 'TIMTextElem',
        msgContent: { text: params.text },
      },
    ],
    refMsgId: '',
    msgRandom: 0,
  };
  const errMsg = SendGroupMessageReq.verify(req);
  if (errMsg) throw new Error(`encodeSendGroupMessageReq verify failed: ${errMsg}`);
  return SendGroupMessageReq.encode(req).finish();
}

/**
 * 解码发送消息响应
 */
function decodeSendMessageRsp(data) {
  try {
    const root = getBizRoot();
    const Rsp = root.lookupType(
      'trpc.yuanbao.yuanbao_conn.yuanbao_openclaw_proxy.SendC2CMessageRsp'
    );
    const errMsg = Rsp.verify(data);
    if (errMsg) return null;
    return Rsp.decode(data);
  } catch (err) {
    logger.warn('[yuanbaobot-proto] decodeSendMessageRsp error:', err.message);
    return null;
  }
}

/**
 * 解码入站消息推送 (用于握手绑定获取 fromAccount)
 */
function decodeInboundMessagePush(data) {
  try {
    const root = getBizRoot();
    const Push = root.lookupType(
      'trpc.yuanbao.yuanbao_conn.yuanbao_openclaw_proxy.InboundMessagePush'
    );
    const errMsg = Push.verify(data);
    if (errMsg) {
      logger.warn(`[yuanbaobot-proto] decodeInboundMessagePush verify: ${errMsg}`);
      return null;
    }
    return Push.decode(data);
  } catch (err) {
    logger.warn('[yuanbaobot-proto] decodeInboundMessagePush error:', err.message);
    return null;
  }
}

// ── 导出 ──────────────────────────────────────────────────────────────

module.exports = {
  // 常量
  CMD_TYPE,
  CMD,
  PB_MSG_TYPES,
  BIZ_MODULE,
  BIZ_CMD,

  // 连接层
  encodeConnMsg,
  decodeConnMsg,
  buildAuthBindMsg,
  buildPingMsg,
  buildPushAck,
  buildBusinessConnMsg,
  decodePB,

  // 业务层
  encodeSendC2CMessageReq,
  encodeSendGroupMessageReq,
  decodeSendMessageRsp,
  decodeInboundMessagePush,

  // 测试用
  getConnRoot,
  getBizRoot,
};
