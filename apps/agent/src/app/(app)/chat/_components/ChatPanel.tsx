"use client";

import { useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useChat } from "@ai-sdk/react";
import { WorkflowChatTransport } from "@ai-sdk/workflow/client";
import type { UIMessage } from "ai";

import { Button } from "@hathway/ui/components/button";
import { Textarea } from "@hathway/ui/components/textarea";

import { chatErrorText } from "@/lib/chatError";
import { paths } from "@/lib/paths";

/**
 * 대화 한 판. 첫 말이면 대화를 열고, 이미 열린 대화면 그 대화에 말을 더 건다.
 *
 * ⚠ **전송은 `WorkflowChatTransport` 다.** 연결이 끊기면 제가 알아서 다시 붙는다. 다시 붙는 주소에 그 턴이
 *    시작하는 스트림 번호를 싣는데, 그 번호는 응답의 `x-turn-start` 에서 받는다.
 * ⚠ **첫 말을 보낸 뒤 주소를 바꾸되 화면을 다시 그리지 않는다.** 대화의 줄은 워크플로의 첫 스텝이 여는데,
 *    그 전에 새 주소로 옮겨 가면 서버가 아직 없는 대화를 404 로 답한다. 주소만 바꿔 새로 고칠 때 돌아올
 *    자리를 남긴다.
 * ⚠ **행위자를 받지 않는다.** 누가 말하는지는 서버가 세션에서 다시 세운다.
 * ⚠ **전송은 `@ai-sdk/workflow/client` 에서 가져온다.** 패키지 뿌리에서 가져오면 워크플로 런타임(큐 · 저장소)이
 *    브라우저 번들에 끌려 들어와 빌드가 깨진다.
 */
/**
 * 도구를 부른 줄에 세울 말. 도구의 이름(`list_my_notes`)은 코드의 값이라 화면에 세우지 않는다.
 * 도구를 더하면 여기에 한 줄을 더한다.
 */
const TOOL_LABELS: Readonly<Record<string, string>> = {
    list_my_notes: "쪽지를 확인했어요",
};

/** 아직 번호가 없는 새 대화의 이름. 한 화면에 새 대화 칸은 하나다 */
const NEW_CONVERSATION = "new-conversation";

export function ChatPanel(
    { runId: initialRunId, initialMessages, open }: {
        readonly runId: string | null;
        readonly initialMessages: ReadonlyArray<UIMessage>;
        readonly open: boolean;
    },
)
{
    const runId = useRef<string | null>(initialRunId);
    const turnStart = useRef(0);
    const [draft, setDraft] = useState("");

    /** 마지막으로 보낸 글. 보내지 못하면 입력칸에 되돌려 다시 적지 않아도 되게 한다 */
    const lastSent = useRef("");

    const transport = useMemo(() => new WorkflowChatTransport<UIMessage>({
        api: paths.chatApi(),
        prepareSendMessagesRequest: ({ messages }) =>
        {
            const last = messages.at(-1);
            const text = last?.parts.map((part) => (part.type === "text" ? part.text : "")).join("") ?? "";

            return {
                api: runId.current === null ? paths.chatApi() : paths.followUpApi(runId.current),
                body: { messageId: last?.id ?? "", text },
            };
        },
        onChatSendMessage: (response) =>
        {
            const id = response.headers.get("x-workflow-run-id");

            turnStart.current = Number(response.headers.get("x-turn-start") ?? "0");

            if (id !== null && runId.current === null)
            {
                runId.current = id;
                window.history.replaceState(null, "", paths.conversation(id));
            }
        },
        prepareReconnectToStreamRequest: ({ api }) => ({
            api: runId.current === null ? api : paths.streamApi(runId.current, turnStart.current),
        }),
    }), []);

    // ⚠ 새 대화에도 id 를 준다. 비우면 useChat 이 렌더 중에 난수로 id 를 짓는데, 새 대화 칸은 틀에 구워지는 조각이라
    //    빌드가 막는다(`CLAUDE.md` 「정적 껍데기」 5). 대화의 번호는 첫 말을 보낸 뒤 Workflow 실행이 정한다
    const { messages, sendMessage, status, error } = useChat({
        id: initialRunId ?? NEW_CONVERSATION,
        messages: [...initialMessages],
        transport,
        onError: () => setDraft((current) => (current === "" ? lastSent.current : current)),
    });

    const busy = status === "submitted" || status === "streaming";

    const submit = (event: React.FormEvent<HTMLFormElement>): void =>
    {
        event.preventDefault();

        const text = draft.trim();

        if (text === "" || busy)
        {
            return;
        }

        lastSent.current = text;
        setDraft("");
        void sendMessage({ text });
    };

    return (
        <div className="flex min-h-0 flex-1 flex-col gap-4">
            <ol className="flex flex-col gap-4" aria-label="대화">
                {messages.map((message) => (
                    <li key={message.id} className={message.role === "user" ? "flex justify-end" : "flex"}>
                        <div
                            data-role={message.role}
                            className={message.role === "user"
                                ? "bg-muted max-w-[80%] rounded-lg px-3 py-2 text-sm whitespace-pre-wrap"
                                : "flex max-w-[80%] flex-col gap-2 text-sm leading-6 whitespace-pre-wrap"}
                        >
                            {message.parts.map((part, index) =>
                            {
                                if (part.type === "text")
                                {
                                    return <p key={index}>{part.text}</p>;
                                }

                                if (part.type.startsWith("tool-"))
                                {
                                    return (
                                        <p key={index} className="text-muted-foreground text-xs">
                                            {TOOL_LABELS[part.type.slice("tool-".length)] ?? "도구를 썼어요"}
                                        </p>
                                    );
                                }

                                return null;
                            })}
                        </div>
                    </li>
                ))}
            </ol>

            {error === undefined ? null : <p role="alert" className="text-destructive text-sm">{chatErrorText(error)}</p>}

            {open
                ? (
                    <form onSubmit={submit} className="mt-auto flex flex-col gap-2">
                        <Textarea
                            aria-label="메시지"
                            value={draft}
                            onChange={(event) => setDraft(event.target.value)}
                            rows={3}
                            placeholder="예: 내 쪽지 정리해 줘"
                        />
                        <div className="flex justify-end">
                            <Button type="submit" disabled={busy || draft.trim() === ""}>
                                {busy ? "답을 기다리는 중" : "보내기"}
                            </Button>
                        </div>
                    </form>
                )
                : (
                    <p className="text-muted-foreground flex items-center gap-2 text-sm">
                        종료된 대화예요.
                        <Link className="text-foreground underline underline-offset-4" href={paths.chat()}>새 대화 시작</Link>
                    </p>
                )}
        </div>
    );
}
