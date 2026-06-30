# Mock Screens — Document Summarizer
## ASCII Wireframes & User Journey Flows

---

## TABLE OF CONTENTS

1. [Screen 1]  Landing / Home Page (Idle State)
2. [Screen 2]  File Upload — Drag & Drop Active
3. [Screen 3]  Text Paste Mode
4. [Screen 4]  File Selected (Ready to Submit)
5. [Screen 5]  Processing — Stage 1: Upload Received (10%)
6. [Screen 6]  Processing — Stage 2: Extracting Text (40%)
7. [Screen 7]  Processing — Stage 3: Summarizing (75%)
8. [Screen 8]  Processing — Stage 4: Finalizing (95%)
9. [Screen 9]  Summary Complete (Success State — 100%)
10. [Screen 10] Error State — Invalid File Type
11. [Screen 11] Error State — File Too Large
12. [Screen 12] Error State — Server / Processing Error
13. [Screen 13] History Panel (Sidebar Open)
14. [Screen 14] History — Single Job Detail View
15. [Workflow A] Complete Happy Path Flow Diagram
16. [Workflow B] Error Path Flow Diagram
17. [Workflow C] Text Paste Flow Diagram
18. [Component Map] UI Component Breakdown
19. [Progress States] Progress Bar All States Reference
20. [Responsive] Responsive Layout Notes

---

## SCREEN 1 — Landing / Home Page (Idle State)

```
+===========================================================================+
|  browser tab: [favicon] Document Summarizer                   [_ ][x]    |
+===========================================================================+
|  http://localhost:3000                                    [  Go  ]        |
+===========================================================================+
|                                                                           |
|  +-----------+  HEADER                                 [History  v]      |
|  |  [~] LOGO |  Document Summarizer                                       |
|  +-----------+  Summarize any PDF or text instantly.                      |
|                                                                           |
+===========================================================================+
|                                                                           |
|          +-------------------------------------------------+              |
|          |                                                 |              |
|          |          UPLOAD YOUR DOCUMENT                   |              |
|          |                                                 |              |
|          |   +---------------------------------------+     |              |
|          |   |                                       |     |              |
|          |   |        [ cloud upload icon ]          |     |              |
|          |   |                                       |     |              |
|          |   |    Drag & drop your file here         |     |              |
|          |   |             -- or --                  |     |              |
|          |   |       [     Browse Files     ]        |     |              |
|          |   |                                       |     |              |
|          |   |  Supports: PDF  .TXT  .DOCX           |     |              |
|          |   |  Max size: 20 MB                      |     |              |
|          |   |                                       |     |              |
|          |   +---------------------------------------+     |              |
|          |                                                 |              |
|          |   ------- or paste / type text below -------   |              |
|          |                                                 |              |
|          |   +---------------------------------------+     |              |
|          |   |                                       |     |              |
|          |   |   Type or paste your text here...     |     |              |
|          |   |                                       |     |              |
|          |   |                                       |     |              |
|          |   +---------------------------------------+     |              |
|          |                                                 |              |
|          |   Sentences in summary:  [ 7 ]  (-)  (+)       |              |
|          |                                                 |              |
|          |           [      Summarize      ]               |              |
|          |                (btn: DISABLED)                  |              |
|          |                                                 |              |
|          +-------------------------------------------------+              |
|                                                                           |
+===========================================================================+
|  FOOTER:  Document Summarizer v1.0  |  Running locally on localhost       |
+===========================================================================+
```

**State notes:**
- No file selected, textarea is empty
- Summarize button is **disabled** (grayed out)
- History dropdown in header is collapsed

---

## SCREEN 2 — File Upload: Drag & Drop Active State

```
+===========================================================================+
|  [~] Document Summarizer                              [History  v]        |
+===========================================================================+
|                                                                           |
|          +-------------------------------------------------+              |
|          |          UPLOAD YOUR DOCUMENT                   |              |
|          |                                                 |              |
|          |   +-  -  -  -  -  -  -  -  -  -  -  -  -  -+  |              |
|          |   |                                          |  |              |
|          |   |      [ cloud upload icon — glowing ]    |  |              |
|          |   |                                          |  |              |
|          |   |      >>> Drop your file here <<<        |  |              |
|          |   |                                          |  |              |
|          |   |   [ dashed border — blue pulse glow ]   |  |              |
|          |   |   [ background tint: blue/10% opacity]  |  |              |
|          |   |                                          |  |              |
|          |   +-  -  -  -  -  -  -  -  -  -  -  -  -  -+  |              |
|          |              ^                                   |              |
|          |              | file is being dragged over        |              |
|          |                                                 |              |
|          +-------------------------------------------------+              |
|                                                                           |
+===========================================================================+
```

**State notes:**
- User is dragging a file over the drop zone
- Border animates (dashed, pulsing blue glow)
- Background of drop zone gets a subtle tint
- Icon scales up slightly (CSS transform)

---

## SCREEN 3 — Text Paste Mode (Textarea Active)

```
+===========================================================================+
|  [~] Document Summarizer                              [History  v]        |
+===========================================================================+
|                                                                           |
|          +-------------------------------------------------+              |
|          |          UPLOAD YOUR DOCUMENT                   |              |
|          |                                                 |              |
|          |   +---------------------------------------+     |              |
|          |   |   [ cloud icon ]  (grayed out)        |     |              |
|          |   |   Drag & drop or Browse Files         |     |              |
|          |   |   (upload area dimmed — text active)  |     |              |
|          |   +---------------------------------------+     |              |
|          |                                                 |              |
|          |   ------- or paste / type text below -------   |              |
|          |                                                 |              |
|          |   +---------------------------------------+     |              |
|          |   | The quick brown fox jumps over the   *|     |              |
|          |   | lazy dog. This is a sample of pasted *|     |              |
|          |   | text that the user has typed or       |     |              |
|          |   | pasted directly into the text area.   |     |              |
|          |   | Lorem ipsum dolor sit amet,           |     |              |
|          |   | consectetur adipiscing elit. Sed do   |     |              |
|          |   | eiusmod tempor incididunt ut labore   |     |              |
|          |   | et dolore magna aliqua.               |     |              |
|          |   |                                    [  |     |              |
|          |   +---------------------------------------+     |              |
|          |     Characters: 342   Words: ~58               |              |
|          |     [ x Clear text ]                           |              |
|          |                                                 |              |
|          |   Sentences in summary:  [ 7 ]  (-)  (+)       |              |
|          |                                                 |              |
|          |           [      Summarize      ]               |              |
|          |                (btn: ENABLED)                   |              |
|          |                                                 |              |
|          +-------------------------------------------------+              |
|                                                                           |
+===========================================================================+
```

**State notes:**
- User has typed/pasted text into the textarea
- Live character and word counter appears below textarea
- Upload zone is dimmed (mutually exclusive modes)
- Summarize button is now **enabled**
- Clear text button visible

---

## SCREEN 4 — File Selected (Ready to Submit)

```
+===========================================================================+
|  [~] Document Summarizer                              [History  v]        |
+===========================================================================+
|                                                                           |
|          +-------------------------------------------------+              |
|          |          UPLOAD YOUR DOCUMENT                   |              |
|          |                                                 |              |
|          |   +---------------------------------------+     |              |
|          |   |                                       |     |              |
|          |   |  [PDF icon]  research_paper.pdf       |     |              |
|          |   |                                       |     |              |
|          |   |  File size:  4.2 MB                   |     |              |
|          |   |  Type:       PDF Document             |     |              |
|          |   |  Pages:      ~30 (estimated)          |     |              |
|          |   |                                       |     |              |
|          |   |           [  x  Remove  ]             |     |              |
|          |   |                                       |     |              |
|          |   +---------------------------------------+     |              |
|          |    [green checkmark]  File ready to upload     |              |
|          |                                                 |              |
|          |   ------- or paste / type text below -------   |              |
|          |   (grayed out — file mode active)              |              |
|          |                                                 |              |
|          |   Sentences in summary:  [ 7 ]  (-)  (+)       |              |
|          |                                                 |              |
|          |           [      Summarize      ]               |              |
|          |                (btn: ENABLED)                   |              |
|          |                                                 |              |
|          +-------------------------------------------------+              |
|                                                                           |
+===========================================================================+
```

**State notes:**
- PDF selected; file preview replaces the upload zone UI
- File name, size, type shown in a clean card
- Remove button resets back to Screen 1
- Text paste area is dimmed
- Summarize button is **enabled**

---

## SCREEN 5 — Processing: Stage 1 — Upload Received (10%)

```
+===========================================================================+
|  [~] Document Summarizer                              [History  v]        |
+===========================================================================+
|                                                                           |
|          +-------------------------------------------------+              |
|          |                                                 |              |
|          |  [PDF icon]  research_paper.pdf  (4.2 MB)       |              |
|          |                                                 |              |
|          |  PROCESSING YOUR DOCUMENT...                    |              |
|          |  Stage: Uploading file to server                |              |
|          |                                                 |              |
|          |  +---------------------------------------+      |              |
|          |  |[=====>                               ]|      |              |
|          |  +---------------------------------------+      |              |
|          |                    10%                          |              |
|          |                                                 |              |
|          |  [spinning icon]  Please wait, do not close    |              |
|          |                                                 |              |
|          |           [       Cancel       ]               |              |
|          |                                                 |              |
|          |  - - - - - - - - - - - - - - - - - - - -       |              |
|          |  Summary will appear here once complete.        |              |
|          |  (placeholder — faded/grayed out)               |              |
|          |                                                 |              |
|          +-------------------------------------------------+              |
|                                                                           |
+===========================================================================+
```

---

## SCREEN 6 — Processing: Stage 2 — Extracting Text (40%)

```
+===========================================================================+
|  [~] Document Summarizer                              [History  v]        |
+===========================================================================+
|                                                                           |
|          +-------------------------------------------------+              |
|          |                                                 |              |
|          |  [PDF icon]  research_paper.pdf  (4.2 MB)       |              |
|          |                                                 |              |
|          |  PROCESSING YOUR DOCUMENT...                    |              |
|          |  Stage: Extracting text from PDF                |              |
|          |                                                 |              |
|          |  +---------------------------------------+      |              |
|          |  |[================>                    ]|      |              |
|          |  +---------------------------------------+      |              |
|          |                    40%                          |              |
|          |                                                 |              |
|          |  [spinning icon]  Reading pages... (12 / 30)   |              |
|          |                                                 |              |
|          |           [       Cancel       ]               |              |
|          |                                                 |              |
|          |  - - - - - - - - - - - - - - - - - - - -       |              |
|          |  Summary will appear here once complete.        |              |
|          |                                                 |              |
|          +-------------------------------------------------+              |
|                                                                           |
+===========================================================================+
```

**State notes:** PyMuPDF is parsing pages. SSE pushes live stage label + % to client.

---

## SCREEN 7 — Processing: Stage 3 — Summarizing (75%)

```
+===========================================================================+
|  [~] Document Summarizer                              [History  v]        |
+===========================================================================+
|                                                                           |
|          +-------------------------------------------------+              |
|          |                                                 |              |
|          |  [PDF icon]  research_paper.pdf  (4.2 MB)       |              |
|          |                                                 |              |
|          |  PROCESSING YOUR DOCUMENT...                    |              |
|          |  Stage: Running summarization algorithm         |              |
|          |                                                 |              |
|          |  +---------------------------------------+      |              |
|          |  |[===============================>     ]|      |              |
|          |  +---------------------------------------+      |              |
|          |                    75%                          |              |
|          |                                                 |              |
|          |  [spinning icon]  Analysing sentence importance |              |
|          |                                                 |              |
|          |           [       Cancel       ]               |              |
|          |                                                 |              |
|          |  - - - - - - - - - - - - - - - - - - - -       |              |
|          |  Summary will appear here once complete.        |              |
|          |                                                 |              |
|          +-------------------------------------------------+              |
|                                                                           |
+===========================================================================+
```

**State notes:** `sumy` LexRank is running. SSE at 75%.

---

## SCREEN 8 — Processing: Stage 4 — Finalizing (95%)

```
+===========================================================================+
|  [~] Document Summarizer                              [History  v]        |
+===========================================================================+
|                                                                           |
|          +-------------------------------------------------+              |
|          |                                                 |              |
|          |  [PDF icon]  research_paper.pdf  (4.2 MB)       |              |
|          |                                                 |              |
|          |  PROCESSING YOUR DOCUMENT...                    |              |
|          |  Stage: Saving to database...                   |              |
|          |                                                 |              |
|          |  +---------------------------------------+      |              |
|          |  |[=====================================>]|      |              |
|          |  +---------------------------------------+      |              |
|          |                    95%                          |              |
|          |                                                 |              |
|          |  [spinning icon]  Almost done...               |              |
|          |                                                 |              |
|          |           [       Cancel       ]               |              |
|          |                                                 |              |
|          |  - - - - - - - - - - - - - - - - - - - -       |              |
|          |  Summary will appear here once complete.        |              |
|          |                                                 |              |
|          +-------------------------------------------------+              |
|                                                                           |
+===========================================================================+
```

**State notes:** Summary record being written to PostgreSQL. SSE at 95%.

---

## SCREEN 9 — Summary Complete (Success State — 100%)

```
+===========================================================================+
|  [~] Document Summarizer                              [History  v]        |
+===========================================================================+
|                                                                           |
|          +-------------------------------------------------+              |
|          |                                                 |              |
|          |  [PDF icon]  research_paper.pdf  (4.2 MB)       |              |
|          |                                                 |              |
|          |  [green checkmark]  DONE!                       |              |
|          |                                                 |              |
|          |  +---------------------------------------+      |              |
|          |  |[======================================]|      |              |
|          |  |   (bar fully filled — solid green)    |      |              |
|          |  +---------------------------------------+      |              |
|          |                   100%                          |              |
|          |  Completed in 3.4 seconds                       |              |
|          |                                                 |              |
|          |      [    Summarize Another Document    ]       |              |
|          |                                                 |              |
|          +-------------------------------------------------+              |
|                                                                           |
|          +-------------------------------------------------+              |
|          | [doc icon]  SUMMARY                             |              |
|          | research_paper.pdf   |  2026-06-25 at 00:41     |              |
|          | Method: sumy (LexRank)  |  Sentences: 7         |              |
|          | Original: 12,400 chars --> Summary: 820 chars   |              |
|          | - - - - - - - - - - - - - - - - - - - - - - -  |              |
|          |                                                 |              |
|          | The paper presents a novel approach to natural  |              |
|          | language processing using graph-based ranking   |              |
|          | algorithms. The authors compare three baseline  |              |
|          | models against their proposed LexRank variant.  |              |
|          | Experiments on the CNN/DailyMail dataset show   |              |
|          | a 4.2% ROUGE-1 improvement over baselines. The  |              |
|          | model performs robustly on long documents with  |              |
|          | minimal computational overhead.                 |              |
|          |                                                 |              |
|          | - - - - - - - - - - - - - - - - - - - - - - -  |              |
|          | [ Copy to Clipboard ]   [ Download as .txt ]   |              |
|          +-------------------------------------------------+              |
|                                                                           |
+===========================================================================+
```

**State notes:**
- Progress bar is **solid green** at 100%
- Summary card fades in below with animation
- "Summarize Another Document" button resets the form
- Copy + Download actions work client-side

---

## SCREEN 10 — Error: Invalid File Type

```
+===========================================================================+
|  [~] Document Summarizer                              [History  v]        |
+===========================================================================+
|                                                                           |
|          +-------------------------------------------------+              |
|          |          UPLOAD YOUR DOCUMENT                   |              |
|          |                                                 |              |
|          |   +---------------------------------------+     |              |
|          |   | [!] photo.jpg                         |     |              |
|          |   | File size: 2.1 MB  |  Type: JPEG      |     |              |
|          |   | [ x Remove ]                          |     |              |
|          |   +---------------------------------------+     |              |
|          |                                                 |              |
|          |   +=======================================+     |              |
|          |   |  [!]  Unsupported File Type           |     |              |
|          |   |                                       |     |              |
|          |   |  Only PDF, TXT, and DOCX files are    |     |              |
|          |   |  supported. JPEG is not accepted.     |     |              |
|          |   |                                       |     |              |
|          |   |  [   Remove & Try Again   ]           |     |              |
|          |   +=======================================+     |              |
|          |   (error box: red border, light red bg)        |              |
|          |                                                 |              |
|          +-------------------------------------------------+              |
|                                                                           |
+===========================================================================+
```

**State notes:** Client-side validation fires before any network request. No API call made.

---

## SCREEN 11 — Error: File Too Large

```
+===========================================================================+
|  [~] Document Summarizer                              [History  v]        |
+===========================================================================+
|                                                                           |
|          +-------------------------------------------------+              |
|          |          UPLOAD YOUR DOCUMENT                   |              |
|          |                                                 |              |
|          |   +---------------------------------------+     |              |
|          |   | [!] bigfile.pdf                       |     |              |
|          |   | File size: 35.8 MB  |  Type: PDF      |     |              |
|          |   | [ x Remove ]                          |     |              |
|          |   +---------------------------------------+     |              |
|          |                                                 |              |
|          |   +=======================================+     |              |
|          |   |  [!]  File Too Large                  |     |              |
|          |   |                                       |     |              |
|          |   |  Maximum allowed size is 20 MB.       |     |              |
|          |   |  Your file is 35.8 MB.                |     |              |
|          |   |                                       |     |              |
|          |   |  Tip: Compress the PDF, or split it   |     |              |
|          |   |  into smaller sections before upload. |     |              |
|          |   |                                       |     |              |
|          |   |  [   Remove File   ]                  |     |              |
|          |   +=======================================+     |              |
|          |                                                 |              |
|          +-------------------------------------------------+              |
|                                                                           |
+===========================================================================+
```

---

## SCREEN 12 — Error: Server / Processing Failure

```
+===========================================================================+
|  [~] Document Summarizer                              [History  v]        |
+===========================================================================+
|                                                                           |
|          +-------------------------------------------------+              |
|          |  [PDF icon]  scanned_doc.pdf  (8.1 MB)          |              |
|          |                                                 |              |
|          |  [red X icon]  PROCESSING FAILED               |              |
|          |                                                 |              |
|          |  +---------------------------------------+      |              |
|          |  |[===============X                     ]|      |              |
|          |  |  (bar red fill up to point of error)  |      |              |
|          |  +---------------------------------------+      |              |
|          |                    45%                          |              |
|          |                                                 |              |
|          |   +=======================================+     |              |
|          |   |  [!]  Processing Error                |     |              |
|          |   |                                       |     |              |
|          |   |  No extractable text found in this    |     |              |
|          |   |  PDF. It may be a scanned or image-   |     |              |
|          |   |  based document.                      |     |              |
|          |   |                                       |     |              |
|          |   |  Error code: TEXT_EXTRACTION_FAILED   |     |              |
|          |   |                                       |     |              |
|          |   |  [ Try Again ]   [ Paste Text Instead]|     |              |
|          |   +=======================================+     |              |
|          |                                                 |              |
|          +-------------------------------------------------+              |
|                                                                           |
+===========================================================================+
```

**State notes:**
- SSE stream sends an `error` event mid-stream
- Progress bar stops and turns red at the % where failure occurred
- Actionable CTAs let user retry or switch to text paste mode

---

## SCREEN 13 — History Panel (Sidebar Open)

```
+===========================================================================+
|  [~] Document Summarizer                              [History  ^]        |
+============================+===============================================+
|  HISTORY                   |                                              |
|  [======================]  |       +---------------------------------+    |
|  [ Search history...  ]    |       |  UPLOAD YOUR DOCUMENT           |    |
|                            |       |                                 |    |
|  > research_paper.pdf      |       |  +---------------------------+  |    |
|    2026-06-25  00:41       |       |  |  [ cloud upload icon ]    |  |    |
|    "The paper presents a   |       |  |  Drag & drop or Browse    |  |    |
|    novel approach to NLP   |       |  +---------------------------+  |    |
|    using graph-based..."   |       |                                 |    |
|    [ View ]                |       |  --- or paste text below ---   |    |
|  ----------------------    |       |                                 |    |
|  > notes.txt               |       |  +---------------------------+  |    |
|    2026-06-24  18:22       |       |  |  Type here...             |  |    |
|    "Today's meeting was    |       |  +---------------------------+  |    |
|    productive. The team    |       |                                 |    |
|    agreed on a new..."     |       |  Sentences: [ 7 ] (-) (+)      |    |
|    [ View ]                |       |                                 |    |
|  ----------------------    |       |  [      Summarize      ]        |    |
|  > thesis_chapter2.pdf     |       |      (btn: disabled)            |    |
|    2026-06-24  14:05       |       |                                 |    |
|    "Chapter 2 explores     |       +---------------------------------+    |
|    the theoretical         |                                              |
|    framework and prior..." |                                              |
|    [ View ]                |                                              |
|  ----------------------    |                                              |
|  > meeting_notes.docx      |                                              |
|    2026-06-23  09:30       |                                              |
|    "Agenda items include   |                                              |
|    sprint planning and..." |                                              |
|    [ View ]                |                                              |
|  ----------------------    |                                              |
|                            |                                              |
|  4 of 12 results           |                                              |
|  [    Load More    ]       |                                              |
|                            |                                              |
+============================+==============================================+
|  FOOTER                                                                   |
+===========================================================================+
```

**State notes:**
- Sidebar slides in from left on "History" click
- Each row: filename, timestamp, summary snippet (first ~100 chars), View button
- Search bar filters history in real time
- Load More paginates (8 items per page)

---

## SCREEN 14 — History: Single Job Detail View

```
+===========================================================================+
|  [~] Document Summarizer                              [History  v]        |
+===========================================================================+
|                                                                           |
|  [ < Back to Upload ]                                                     |
|                                                                           |
|          +-------------------------------------------------+              |
|          |  [doc icon]  SUMMARY DETAIL                     |              |
|          |                                                 |              |
|          |  Filename:     research_paper.pdf               |              |
|          |  Processed:    2026-06-25 at 00:41:12           |              |
|          |  Job ID:       a1b2c3d4-5e6f-7890-abcd-...      |              |
|          |  Method:       sumy (LexRank, 7 sentences)      |              |
|          |  Original:     12,400 characters                |              |
|          |  Summary:      820 characters                   |              |
|          |  Duration:     3.4 seconds                      |              |
|          |  Status:       [green dot] Done                 |              |
|          |                                                 |              |
|          |  - - - - - - - - - - - - - - - - - - - - - -   |              |
|          |                                                 |              |
|          |  The paper presents a novel approach to natural |              |
|          |  language processing using graph-based ranking  |              |
|          |  algorithms. The authors compare three baseline |              |
|          |  models against their proposed LexRank variant. |              |
|          |  Experiments conducted on the CNN/DailyMail     |              |
|          |  dataset demonstrate a 4.2% ROUGE-1 improvement.|              |
|          |  The model performs robustly on long documents  |              |
|          |  with minimal computational overhead. Future    |              |
|          |  work will explore multilingual datasets.       |              |
|          |                                                 |              |
|          |  - - - - - - - - - - - - - - - - - - - - - -   |              |
|          |                                                 |              |
|          |  [ Copy to Clipboard ]  [ Download .txt ]       |              |
|          |                         [  Delete Job   ]       |              |
|          |                                                 |              |
|          +-------------------------------------------------+              |
|                                                                           |
+===========================================================================+
```

---

## WORKFLOW A — Complete Happy Path Flow

```
USER ACTION                    FRONTEND                     BACKEND / DB
=================              ==================           =================

Opens localhost:3000
        |
        v
 [SCREEN 1: HOME shown]
 Upload area + textarea
 Summarize btn (disabled)
        |
        |-- selects file -----> File preview shown
        |   (or pastes text)    Character count shown
        |                       Summarize btn ENABLED
        v
 [SCREEN 4: FILE READY]
        |
        |-- clicks Summarize --> POST /api/summarize
        |                        (multipart/form-data)
        |                               |
        |                         Validate file type  OK
        |                         Validate file size  OK
        |                         Save file to disk
        |                         Create DB job row
        |                         status = "queued"
        |                         Returns 202 + job_id
        |<---- job_id ----------------------------|
        |
        |-- Opens SSE ----------> GET /api/progress/{job_id}
        |                               |
        |                         Launch background task
        |                         Update progress = 10%
        |<--- SSE: 10% stage="upload_received"
        |
 [SCREEN 5: 10%]            Extract text via PyMuPDF
        |                         Update progress = 40%
        |<--- SSE: 40% stage="text_extracted"
        |
 [SCREEN 6: 40%]            Run sumy LexRank
        |                         Update progress = 75%
        |<--- SSE: 75% stage="summarizing"
        |
 [SCREEN 7: 75%]            Write summary to PostgreSQL
        |                         Update progress = 95%
        |<--- SSE: 95% stage="saving"
        |
 [SCREEN 8: 95%]            Mark job done
        |                         Update progress = 100%
        |<--- SSE: 100% stage="done" + summary text
        |                    SSE stream closes
 [SCREEN 9: DONE]
 Summary card appears
 User reads / copies / downloads
        |
        |-- "Summarize Another" --> Reset to SCREEN 1
        |
        |-- opens History --------> GET /api/history
                                    Returns all past jobs
                               [SCREEN 13: HISTORY]
```

---

## WORKFLOW B — Error Path Flow

```
USER ACTION               FRONTEND                     BACKEND / DB
=================         ==================           =================

 [FILE SELECTED]
 (invalid type: .jpg)
        |
        |-- clicks Summarize -->
        |
        v  (client-side validation fires BEFORE network)
 [SCREEN 10: INVALID TYPE]
 Error banner shown
 No API call made
        |
        |-- Remove & Try Again --> SCREEN 1 (reset)


 ---- OR: error occurs SERVER SIDE mid-processing ----

 [FILE SELECTED]
 (scanned PDF: no text)
        |
        |-- clicks Summarize --> POST /api/summarize  OK
        |<---- job_id -----------------------------|
        |
        |-- Opens SSE ---------->
        |<--- SSE: 10%  upload received
        |<--- SSE: 25%  validated
        |                         PyMuPDF finds NO text
        |                         Update DB: status=error
        |<--- SSE: error  progress=45%, stage="failed"
        |                    SSE closes
        v
 [SCREEN 12: SERVER ERROR]
 Progress bar RED at 45%
 Error message + error code
 CTAs: [Try Again] [Paste Text Instead]
        |
        |-- Try Again -----------> SCREEN 1 (reset)
        |-- Paste Text ----------> SCREEN 3 (textarea focus)
```

---

## WORKFLOW C — Text Paste Flow (No File Upload)

```
USER ACTION               FRONTEND                     BACKEND / DB
=================         ==================           =================

 [SCREEN 1: HOME]
        |
        |-- clicks textarea --> Textarea focused
        |-- types / pastes --> Live char + word count
        |                      Upload zone dimmed
        |                      Summarize btn ENABLED
        v
 [SCREEN 3: TEXT ACTIVE]
        |
        |-- adjusts sentence -> Count display updates
        |   count control
        |
        |-- clicks Summarize --> POST /api/summarize
        |                        body: { text: "...",
        |                                sentences: 7 }
        |<---- job_id -----------------------------|
        |
        |-- Opens SSE ---------->
        |                         No file extraction step
        |                         progress = 10% -> 25%
        |<--- SSE: 25%  validated
        |                         Run sumy directly on text
        |                         progress = 25% -> 75%
        |<--- SSE: 75%  summarizing
        |                         Save to PostgreSQL
        |                         progress = 75% -> 100%
        |<--- SSE: 100% done + summary
        v
 [SCREEN 9: DONE]
 (Faster than PDF path
  — no extraction step)
```

---

## COMPONENT MAP — UI Component Breakdown

```
App.tsx
  |
  +-- <Header />
  |     [~] Logo
  |     Title: "Document Summarizer"
  |     <HistoryButton />  (toggles sidebar)
  |
  +-- <HistoryPanel />   (conditionally rendered)
  |     <SearchBar />
  |     <HistoryList />
  |       <HistoryItem /> x N
  |           filename
  |           timestamp
  |           summary snippet (100 chars)
  |           [ View ] button
  |     <LoadMoreButton />
  |
  +-- <MainContent />
        |
        +-- <UploadSection />
        |     <DropZone />          (drag-over target)
        |     <FileBrowserInput />  (hidden <input type=file>)
        |     <BrowseButton />      (triggers file input)
        |     <FilePreview />       (file name, size, type, remove)
        |     <Divider />           ("or paste text below")
        |     <TextArea />          (raw text input)
        |     <CharacterCounter />  (live count)
        |     <ClearTextButton />
        |     <SentenceControl />   (number input with +/-)
        |     <SubmitButton />      (disabled/enabled)
        |
        +-- <ProgressSection />    (shown after submit)
        |     <FileInfo />          (filename + size)
        |     <StatusLabel />       (stage description)
        |     <ProgressBar />
        |         <BarTrack />      (outer container)
        |         <BarFill />       (animated fill, color changes)
        |     <PercentageLabel />   (e.g. "75%")
        |     <SpinnerIcon />
        |     <CancelButton />
        |
        +-- <SummaryCard />        (shown on completion)
        |     <SummaryHeader />     (filename, date, method, stats)
        |     <SummaryBody />       (summary text paragraphs)
        |     <CopyButton />        (clipboard API)
        |     <DownloadButton />    (creates .txt blob)
        |
        +-- <ErrorBanner />        (shown on error)
              <ErrorIcon />
              <ErrorTitle />
              <ErrorMessage />
              <ErrorCode />         (technical error ID)
              <RetryButton />
              <AlternateActionButton /> (e.g. "Paste Text Instead")
```

---

## PROGRESS BAR — All States Reference

```
IDLE (not yet submitted — bar hidden):
  (not rendered)


UPLOADING — 10%:
  +--------------------------------------------+
  |[====>                                      ]|
  +--------------------------------------------+
        10%   Stage: Uploading file to server...


EXTRACTING — 40%:
  +--------------------------------------------+
  |[=================>                         ]|
  +--------------------------------------------+
              40%   Stage: Extracting text from PDF...


SUMMARIZING — 75%:
  +--------------------------------------------+
  |[=================================>         ]|
  +--------------------------------------------+
                        75%   Stage: Running summarization...


SAVING — 95%:
  +--------------------------------------------+
  |[=========================================> ]|
  +--------------------------------------------+
                                 95%   Stage: Saving to database...


COMPLETE — 100% (green):
  +--------------------------------------------+
  |[==========================================]|   <- solid green
  +--------------------------------------------+
                                100%   [checkmark] Done!


ERROR (at 45%, red fill):
  +--------------------------------------------+
  |[==================X                        ]|   <- solid red
  +--------------------------------------------+
                  45%   [!] Processing failed
```

---

## RESPONSIVE LAYOUT NOTES

```
DESKTOP (>= 1280px):
+================================================================+
|  HEADER: [Logo]  Document Summarizer        [History Button]  |
+================================================================+
| HISTORY SIDEBAR |  MAIN CONTENT AREA                          |
| (300px fixed)   |  +-----------------------------------------+|
|                 |  |  UPLOAD SECTION                         ||
| [ search... ]   |  +-----------------------------------------+|
| > item 1        |  |  PROGRESS BAR (hidden until submit)     ||
| > item 2        |  +-----------------------------------------+|
| > item 3        |  |  SUMMARY CARD (hidden until done)       ||
| > item 4        |  +-----------------------------------------+|
|                 |                                             |
+================================================================+
|  FOOTER                                                        |
+================================================================+


TABLET (768px – 1279px):
+============================================+
|  HEADER: [Logo]  Doc Summarizer  [History]|
+============================================+
|  MAIN CONTENT                              |
|  +--------------------------------------+  |
|  |  UPLOAD SECTION                      |  |
|  +--------------------------------------+  |
|  |  PROGRESS BAR                        |  |
|  +--------------------------------------+  |
|  |  SUMMARY CARD                        |  |
|  +--------------------------------------+  |
|                                            |
|  [History] (collapsible accordion below)  |
+============================================+
|  FOOTER                                    |
+============================================+


MOBILE (< 768px):
+========================+
|  HEADER (compact)      |
|  [Logo] [~] [History]  |
+========================+
|  UPLOAD SECTION        |
|  (full width, stacked) |
+========================+
|  PROGRESS BAR          |
+========================+
|  SUMMARY CARD          |
+========================+
|  HISTORY (accordion)   |
|  [tap to expand]       |
+========================+
|  FOOTER                |
+========================+
```

---

*End of Mock Screens — Document Summarizer v1.0*
