// 全局 message / modal 桥：antd 静态 message、Modal.confirm 等 API 无法消费 ConfigProvider 上下文，
// 深色模式与自定义主题色不会作用于其弹出提示。
// 由 App.tsx 组件树内的 MessageBinder 绑定 App.useApp() 实例，
// 供组件与非组件模块（hooks、utils）统一调用；绑定前回退到静态 API。
import {Modal as staticModal, message as staticMessage} from "antd";
import type {MessageInstance} from "antd/es/message/interface";
import type {HookAPI as ModalHookAPI} from "antd/es/modal/useModal";

let boundMessage: MessageInstance | null = null;
let boundModal: ModalHookAPI | null = null;

/** bindMessage 绑定组件树内的 message 实例（由 App.tsx 挂载时调用） */
export function bindMessage(api: MessageInstance): void {
    boundMessage = api;
}

/** bindModal 绑定组件树内的 modal 实例（由 App.tsx 挂载时调用） */
export function bindModal(api: ModalHookAPI): void {
    boundModal = api;
}

/** appMessage 全局可用的 message：优先使用绑定实例，未绑定时回退静态 API */
export const appMessage: MessageInstance = new Proxy(staticMessage as unknown as MessageInstance, {
    get(target, prop) {
        return ((boundMessage ?? target) as any)[prop];
    },
});

/** appModal 全局可用的 modal：优先使用绑定实例，未绑定时回退静态 API */
export const appModal: ModalHookAPI = new Proxy(staticModal as unknown as ModalHookAPI, {
    get(target, prop) {
        return ((boundModal ?? target) as any)[prop];
    },
});
