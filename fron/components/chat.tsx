"use client"

import { useState } from "react";
import useSocket from "../hooks/useSocket";

const Chat = () => {
    const { messages, sendMessage } = useSocket();
    const [input, setInput] = useState("");

    const handleSend = () => {
        if (input.trim()) {
            sendMessage(input);
            setInput("");
        }
    };

    return (
        <div style={{ width: "400px", border: "1px solid #ccc", padding: "10px" }}>
            <h3>Rasa Chat</h3>
            <div style={{ maxHeight: "300px", overflowY: "auto" }}>
                {messages.map((msg, index) => (
                    <p key={index} style={{ textAlign: msg.sender === "bot" ? "left" : "right" }}>
                        <strong>{msg.sender}:</strong> {msg.text}
                    </p>
                ))}
            </div>
            <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Type a message..."
            />
            <button onClick={handleSend}>Send</button>
        </div>
    );
};

export default Chat;
