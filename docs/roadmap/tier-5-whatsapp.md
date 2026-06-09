# Tier 5 — WhatsApp Business integration

> **Hackathon target:** ETHGlobal NY 2026 (~Nov 2026).
> **Effort budget:** 7 days solo dev (after Tier 2 ships).
> **Risk:** Medium — Meta's WhatsApp Business API review process is
> 5-10 business days and can reject for unclear reasons.

## The user-facing change

After Tier 5, Kajota Coach becomes the **AI sales floor** for the
user's WhatsApp Business presence. Specifically:

1. **One-tap publish to WhatsApp catalog.** After Coach drafts a
   listing, user taps "Push to WhatsApp." The product appears as a
   real catalog item with image, price, description.
2. **Auto-reply to customer inquiries.** When a customer messages
   *"Is this still available?"* or *"Can you do 4k for it?"*, Coach
   Agent intercepts, answers from current stock/price context, and
   alerts the seller of high-value or unusual conversations.
3. **One-link payment via WhatsApp.** When a customer commits, Coach
   sends a Yellow Card payment URL. On payment, escrow auto-arms
   (Tier 1 flow continues from here).

The result: a market trader can run a complete co-sell business from
WhatsApp without ever opening the Kajota app for daily operations
(only for new listings).

## Why it matters

WhatsApp is **the operating system of African informal commerce**:

- ~95% of small African retailers use WhatsApp as their primary
  customer channel.
- ~70% of African informal commerce conversations include payment
  negotiation that never closes (deals lost to friction).
- Catalog features in WhatsApp Business are massively underused
  because creating product entries is tedious.

Tier 5 meets the seller where they already are. We don't ask them to
use a new app daily; we make our agent invisible inside their existing
workflow.

## Acceptance criteria

1. From Coach Agent's `proposeListingForPublish` flow, the user can
   choose "Mesh + WhatsApp" or just "Mesh". If both, the listing goes
   on-chain AND appears in the user's WhatsApp catalog within 30
   seconds.
2. A customer (any WhatsApp user) messages the seller's number with
   *"how much for the bell pepper"*. Coach Agent responds within 5
   seconds with current price, stock count, and a CTA: *"Want me to
   reserve 2 bags for you?"*
3. If the customer says yes, agent sends a Yellow Card payment URL.
   On payment, escrow auto-arms (Tier 1 deposit).
4. The seller sees all auto-replies in a "Coach assist" tab in the
   Kajota app. They can intervene mid-conversation by typing manually
   (the agent steps back).
5. Voice notes from customers (Pidgin, Yoruba, etc.) are transcribed
   and routed through the agent (uses Tier 4's voice pipeline).

## Architecture

```
┌──────────────────────────────────────────────────────────┐
│                      Meta WhatsApp                       │
│                  Cloud API (Graph v17.0)                 │
└────┬──────────────────────────────────────────┬──────────┘
     │ Webhook (POST /whatsapp/inbound)         │
     │ for every incoming message               │
     ▼                                          │
┌──────────────────────────────────┐            │
│  WhatsAppInboundController       │            │
│  (kajota-mobile-backend)         │            │
└─────┬────────────────────────────┘            │
      │                                         │
      ▼                                         │
┌──────────────────────────────────┐            │
│  WhatsAppConversationService     │            │
│  - resolves phoneNumber ↔ userId │            │
│  - loads conversation context    │            │
│  - calls into existing           │            │
│    CoachAgentService.chat()      │            │
└─────┬────────────────────────────┘            │
      │                                         │
      ▼                                         │
┌──────────────────────────────────┐            │
│  Agent generates reply           │            │
│  + optional tool calls           │            │
└─────┬────────────────────────────┘            │
      │                                         │
      ▼                                         │
┌──────────────────────────────────┐            │
│  WhatsAppOutboundService         │            │
│  - sends text / image / catalog  │            │
│    item / payment link via API   │            │
└──────────────────────────────────┘            │
                                                │
                                                │
┌──────────────────────────────────────┐        │
│  Mobile app "Coach assist" tab       │        │
│  - WebSocket subscription            │        │
│  - shows agent conversations live    │◄───────┘
│  - human-in-the-loop intervention    │
└──────────────────────────────────────┘
```

## Files to touch

### `kajota-mobile-backend`

**New:** `controller/WhatsAppInboundController.java`

```java
@RestController
@RequestMapping("/whatsapp")
public class WhatsAppInboundController {
    @GetMapping("/inbound")
    public String verify(@RequestParam("hub.mode") String mode,
                         @RequestParam("hub.challenge") String challenge,
                         @RequestParam("hub.verify_token") String token) {
        // Meta webhook verification handshake
        if (META_VERIFY_TOKEN.equals(token)) return challenge;
        throw new ForbiddenException();
    }

    @PostMapping("/inbound")
    public ResponseEntity<Void> receive(@RequestBody WhatsAppWebhookPayload payload) {
        whatsAppConversationService.handleWebhook(payload);
        return ResponseEntity.ok().build();
    }
}
```

**New:** `service/WhatsAppConversationService.java`

The brains. Per-customer-phone-number conversation thread. Caches
context in Mongo so multi-message conversations work.

```java
public void handleWebhook(WhatsAppWebhookPayload payload) {
    for (Message m : payload.getMessages()) {
        String sellerPhone = payload.getTo();
        String customerPhone = m.getFrom();

        // Find which Kajota user owns this seller phone
        User seller = userRepo.findByWhatsAppPhone(sellerPhone)
            .orElseThrow();

        // Load or create the customer conversation
        WhatsAppConversation conv = convRepo.findOrCreate(seller.id, customerPhone);

        // Build a request to the existing Coach Agent
        CoachAgentDto.RequestDto req = new CoachAgentDto.RequestDto();
        req.setSessionId(conv.getAgentSessionId());
        req.setUserMessage(transcribe(m));  // handles voice notes too
        req.setImageBase64(m.getImageBase64());  // if any
        req.setCurrency(seller.getCurrency());

        CoachAgentDto.ResponseDto reply = coachAgentService.chat(req, seller.getId());

        // Send the reply over WhatsApp
        whatsAppOutboundService.sendText(customerPhone, reply.getReply());

        // Surface to mobile via WS for human-in-loop
        notifyMobile(seller.getId(), conv, reply);
    }
}
```

**New:** `service/WhatsAppOutboundService.java`

Wraps Meta's WhatsApp Cloud API.

```java
public void sendText(String to, String text) {
    restTemplate.exchange(
        "https://graph.facebook.com/v17.0/" + WA_PHONE_NUMBER_ID + "/messages",
        POST,
        new HttpEntity<>(Map.of(
            "messaging_product", "whatsapp",
            "to", to,
            "type", "text",
            "text", Map.of("body", text)
        )),
        String.class
    );
}

public void sendCatalogItem(String to, String productSku) {
    restTemplate.exchange(/* template = interactive product message */);
}

public void sendPaymentLink(String to, String yellowCardUrl, String description) {
    sendText(to, description + "\n" + yellowCardUrl);
}
```

**New:** `controller/WhatsAppCatalogSyncController.java`

Endpoint: `POST /ai/coach/publish-to-whatsapp` — called from the
mobile app when user opts to mirror a listing to WhatsApp Catalog.

```java
@PostMapping("/publish-to-whatsapp")
public ResponseEntity<CatalogItemDto> publish(@RequestBody PublishToCatalogRequest req, Principal principal) {
    // Upload image to Meta Cloud Storage
    // Create catalog item via Graph API
    // Store mapping product_id ↔ whatsapp_catalog_id
}
```

**New:** `model/entity/WhatsAppConversation.java`

```java
@Document("whatsapp_conversation")
public class WhatsAppConversation {
    @Id String id;
    String sellerId;       // Kajota userId
    String customerPhone;
    String agentSessionId; // links to existing CoachAgentSession
    Instant lastMessageAt;
    boolean humanTakeoverActive;  // if seller intervened
    int messageCount;
}
```

### `kajota-coach` (mobile)

**New:** `src/screens/WhatsAppAssistScreen.tsx`

Shows all live conversations the agent is handling. Each row shows:
- Customer phone (anonymised to last 4 digits)
- Last message preview
- Agent's pending reply (with "Send" / "Edit" / "Take over" buttons)
- Status: "Auto-replying" / "Awaiting your input" / "Customer paid"

**New:** `src/screens/WhatsAppOnboardingScreen.tsx`

Onboarding flow:
1. User selects "Connect WhatsApp Business."
2. App opens Meta's auth URL (in-app browser).
3. User authorizes Kajota's WhatsApp Business app.
4. Backend stores access token + phone_number_id.
5. Test message: *"Coach is now live on your WhatsApp."*

**Modified:** `src/screens/MeshSignScreen.tsx`

After register tx confirms, show an additional "Push to WhatsApp"
button. Calls `/ai/coach/publish-to-whatsapp`.

### Meta WhatsApp Business setup (out-of-code)

⚠️ This is the multi-day part.

1. **Apply for WhatsApp Business API access via Meta for Developers.**
   Requires a Facebook Business Manager account + verified business
   identity. Approval takes 5-10 business days.
2. **Add Phone Number** to your WhatsApp Business Account. This is the
   number sellers' customers will message.
3. **Configure webhook URL** to point at
   `https://kajota-mobile-backend-2.onrender.com/whatsapp/inbound`.
4. **Subscribe to message events.**
5. **Test with the Meta test number** before going live.

**Cost model:**

- WhatsApp Business API charges per "conversation" (24-hour window
  with a customer). Service conversations are free; marketing
  conversations cost ~$0.025-0.10 depending on country.
- For African markets: ~$0.06/conversation, billed monthly to Kajota.
- Pass this through to sellers? Probably not for v1 — eat the cost as
  user acquisition.

## Demo script (ETHGlobal NY 2026 submission)

The narrative is "AI runs my whole business from WhatsApp":

1. **0:00-0:15** — A market trader in Lagos receives a WhatsApp
   message from a customer: *"How much for 2 bags of rice?"*
2. **0:15-0:30** — Without the seller doing anything, Coach Agent (on
   the seller's behalf) replies: *"₦18,000 for two bags, fresh stock,
   I can deliver via GIG today. Should I reserve?"*
3. **0:30-0:45** — Customer: *"Yes."* Agent: *"Great! Here's your
   payment link [Yellow Card URL]. Pay ₦18,000 and I'll dispatch."*
4. **0:45-1:00** — Customer pays. Escrow auto-arms (Tier 1).
5. **1:00-1:15** — Seller is shown a WhatsApp Assist notification:
   *"Sale closed. ₦18,000 escrowed. Confirm shipment when ready."*
6. **1:15-1:30** — Cut to Etherscan showing the Deposited event. Final
   text overlay: *"From WhatsApp to on-chain escrow in 90 seconds.
   The seller said nothing."*

## Spikes to run BEFORE committing to scope

🚧 **Spike 1: Meta WhatsApp Business API approval.** Start Day 0.
This is the 5-10 day blocker. Apply *immediately*.

🚧 **Spike 2: Inbound webhook reliability on Render.** 2 hours.

Meta requires <5 sec response time. Test that Render's free dyno can
sustain it; if not, queue the work and reply 200 immediately.

🚧 **Spike 3: Voice note transcription cost.** 1 hour.

If we get a flood of voice notes, transcription via Gemini Live can be
expensive. Estimate the rate and either cap or batch.

## Timeline (7 days, after WhatsApp API approval lands)

| Day | Hours | Deliverable |
| --- | --- | --- |
| Day 1 | 6h | Webhook verify + inbound endpoint. End-to-end: a real WhatsApp message reaches our backend. |
| Day 2 | 8h | WhatsAppConversationService + integration with CoachAgentService. Outbound text reply. |
| Day 3 | 8h | Image messages + voice notes. Image attached to agent's analyzeProductImage. |
| Day 4 | 8h | Catalog item sync. publishToWhatsApp endpoint + mobile button. |
| Day 5 | 8h | Yellow Card payment links sent in-conversation. Escrow auto-arm on payment webhook. |
| Day 6 | 8h | WhatsAppAssistScreen — live conversations, take-over flow. |
| Day 7 | 8h | Demo recording. |

## Dependencies

- **Upstream:**
  - Tier 2 (invisible wallet + Yellow Card) is required for payment
    links to work end-to-end.
  - Tier 4 (voice) is required for voice-note transcription.
  - Tier 1 (Mesh loop) is required for escrow auto-arm.
- **Downstream:** Tier 6 (intelligence) — WhatsApp conversation history
  is a treasure trove of pricing / demand data.

## Edge cases & open questions

1. **Customer privacy.** Are we storing all WhatsApp conversations
   indefinitely? Mongo collection retention policy needed (90 days?).
2. **Multi-tenant phone numbers.** Some sellers will want their own
   verified WhatsApp number; others fine with a shared Kajota number.
   Phase 1 = each seller brings their own, phase 2 = shared option.
3. **Spam / harassment.** Coach Agent should detect abusive messages
   and not engage. Build basic profanity / threat filter.
4. **Language detection.** Use Tier 4's language pipeline — Coach
   should reply in the customer's language, not the seller's.
5. **Take-over UX.** When the seller wants to step in, the agent must
   *cleanly* hand off mid-conversation. Use a "human is typing"
   indicator from the seller's side.
6. **Reply latency.** WhatsApp conversations feel real-time.
   `CoachAgentService.chat()` currently takes ~2-4 seconds (Gemini round
   trip). May need streaming responses to feel snappier.
7. **Templated messages outside the 24h window.** Meta requires
   pre-approved templates for non-service messages. Submit templates
   for: payment reminder, dispatch confirmation, settlement
   notification.

## Risk register

| Risk | Likelihood | Mitigation |
| --- | --- | --- |
| Meta rejects WhatsApp Business application | Medium | Apply ASAP; backup plan = run on a Meta test number for hackathon submission. |
| Webhook latency on Render | Medium | Async-queue the work, respond 200 fast. |
| Conversation context leaks across customers | High if not careful | Strict sessionId namespacing per (seller, customer) pair. |
| Customer pays but tx fails | Medium | Retry queue + manual reconciliation dashboard. |
| Bot replies feel robotic | High | A/B test prompt; ship "Edit before send" toggle for first 100 conversations to learn. |

## Why this is the killer ETHGlobal submission

Most ETHGlobal demos are technical showcases. Tier 5 + Tier 1 + Tier 2
together produce a demo where **a real customer paying a real seller on
WhatsApp** drives an on-chain settlement. No browser, no Web3 jargon,
no MetaMask popup. The chain is invisible infrastructure that just
happens to make the deal enforceable.

The narrative is *"we used Web3 to make Web2 better, not to make Web3
visible."* That's a winning angle at a Web3 hackathon where most
submissions still ask users to learn what a wallet is.
