import requests
from app.core.config import settings

class DiscordBot:

    __instance = None

    def __new__(cls):
        if cls.__instance is None :
            cls.__instance = super().__new__(cls)
        return cls.__instance

    def __init__(self):
        self.webhook_url = settings.DISCORD_WEBHOOK_URL
        self.username = settings.DISCORD_USERNAME

    def send(self, message: str):

        if not self.webhook_url:
            return

        try:
            requests.post(
                self.webhook_url,
                json={
                    "username": self.username,
                    "content": message
                },
                timeout=3
            )

        except Exception:
            # Discord failure should never affect backend
            pass


discord_logger = DiscordBot()