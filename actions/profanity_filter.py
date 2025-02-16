# from better_profanity import profanity
# from rasa_sdk import Action
# from rasa_sdk.events import UserUtteranceReverted

# class ActionFilterProfanity(Action):
#     def name(self):
#         return "action_filter_profanity"

#     def run(self, dispatcher, tracker, domain):
#         user_message = tracker.latest_message.get("text")

#         # Check if the message contains profanity
#         if profanity.contains_profanity(user_message):
#             dispatcher.utter_message("Please avoid using offensive language. Let's keep it friendly! 😊")
#             return [UserUtteranceReverted()]  # Ignore this message in conversation history

#         return []



# or

# list bad words without library
# BAD_WORDS = ["fuck", "shit", "bitch", "asshole", "damn"]

# def contains_profanity(text):
#     return any(word in text.lower() for word in BAD_WORDS)
