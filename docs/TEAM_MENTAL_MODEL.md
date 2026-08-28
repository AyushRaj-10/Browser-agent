# Team Mental Model

These statements are the shared truths of the project. Individual implementations may differ, but these statements must not.

1. The project is a browser AI agent with a local privacy layer.
2. The browser/client is the first place where privacy can be enforced because it sees the original page.
3. Local perception may use DOM, screenshots, OCR, and local vision.
4. Local vision is a real part of the solution, not a decorative feature.
5. DOM is complementary to vision; it is not a replacement for visual understanding.
6. DOM, OCR, and vision detections must eventually enter one unified representation.
7. The Privacy Engine owns the decision about how sensitive information is treated.
8. Raw sensitive information must not cross the client-to-server privacy boundary.
9. Sanitized context may cross that boundary when remote reasoning is needed.
10. The remote model reasons about sanitized context; it does not own the user's raw secrets.
11. The remote model returns structured actions, not unrestricted browser code.
12. The local browser validates the action before execution.
13. Current browser state is authoritative over model assumptions.
14. If required privacy processing fails, protected context must not be transmitted.
15. Normal browsing should remain normal; privacy protection should mostly be invisible to the user.
16. The team optimizes for the SIH evaluation criteria, not feature count.
17. A feature is not part of the project merely because it is technically interesting.
18. Every component has one primary owner.
19. Interfaces are shared; internal implementations are owned by the relevant person.
20. Mocks and contracts exist so people can work independently.
