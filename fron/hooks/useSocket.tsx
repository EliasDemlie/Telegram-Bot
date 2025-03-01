import { useEffect, useState } from "react";
import { io, Socket } from "socket.io-client";

type Message = {
  sender: string;
  text: string;
};

const sessionId = "test_session_123"; // Replace with a unique ID per user
const socket: Socket = io("http://localhost:5007", { transports: ["websocket"] });

const useSocket = () => {
  const [messages, setMessages] = useState<Message[]>([]);

  useEffect(() => {
    socket.on("connect", () => {
      console.log("Connected to Rasa server");

      // Send session request
      socket.emit("session_request", { session_id: sessionId });

      socket.on("session_confirm", (data) => {
        console.log("Session confirmed:", data);
      });
    });

    socket.on("bot_uttered", (response: { text: string }) => {
      setMessages((prev) => [...prev, { sender: "bot", text: response.text }]);
      console.log("Received from bot:", response.text);
    });

    // Cleanup on component unmount
    return () => {
      socket.off("bot_uttered");
      socket.off("session_confirm");
    };
  }, []);

  const sendMessage = (message: string) => {
    console.log("Sending message to Rasa:", message);
    socket.emit("user_uttered", { message, session_id: sessionId });
    setMessages((prev) => [...prev, { sender: "user", text: message }]);
  };

  return { messages, sendMessage };
};

export default useSocket;
