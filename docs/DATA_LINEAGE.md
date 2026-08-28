# Data Lineage

| Data | Created by | Consumed by | Modified by | Stored where | Transmitted where | Deleted when |
|---|---|---|---|---|---|---|
| User task | User/extension | Agent pipeline | Context formatter | Temporary client state | Backend if remote reasoning | After task/request |
| Raw DOM | Browser/extension | DOM analyzer | Privacy sanitization | Temporary client memory | Not in raw form | After processing |
| Raw screenshot | Extension | Vision/OCR | Redaction pipeline | Temporary client memory | Not in raw form | After processing |
| OCR output | OCR module | Unified representation | Privacy engine | Temporary client memory | Sanitized derivative only | After task |
| Vision detections | Vision module | Unified representation | Privacy engine | Temporary client memory | Sanitized derivative only | After task |
| Protected-element records | Privacy engine | Redaction/context builder | Policy processing | Temporary client memory | Sanitized derivative only | After task |
| Sanitized context | Privacy engine | Backend | Request formatter | Temporary | Server | After request/task |
| Model output | VLM/LLM | Validator | Schema validation | Temporary | Browser client | After action |
| Agent action | VLM/LLM | Action validator | Validator | Temporary | Browser | After execution |
| Actual secret value | Local secret layer if used | Local executor | Local resolution | Local secure storage | Should remain local | User/policy controlled |
| Secret reference | Local secret layer | Server/action flow if needed | None | Temporary/local | Reference only if design permits | After task |
| Metrics | Evaluation system | Evaluation/reporting | Aggregator | Evaluation storage | Controlled | Per project policy |
| Logs | Components | Developers | Logging layer | Controlled | Avoid sensitive content | Per logging policy |
