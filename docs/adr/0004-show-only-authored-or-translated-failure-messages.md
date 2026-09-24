# Show only authored or translated failure messages

Failure text shown to people is decided at the API boundary. Domain errors carry a stable code and an authored message, which the API returns with a mapped HTTP status; request-shape failures return 400 with the authored field messages from the shared Zod contract; every other failure returns a generic message.

The original error is logged by the API for debugging and never sent to the client. The web app renders only the API's message and must never render raw database or platform text.
