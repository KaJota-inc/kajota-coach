# Beat 2 of the OKX.AI Genesis demo — the 402 challenge.
#
# What plays: a buyer agent hits Kajota Coach's premium endpoint and the
# server answers with an HTTP 402 carrying a live on-chain price tag —
# amount, asset, network (eip155:195 = XLayer testnet), and payTo.
#
# Runtime target: ~9 seconds of clean terminal. Beat 2 in the storyboard
# is 22s; the remaining 13s are voice-over + on-screen text overlay.
#
# Render with:
#   vhs demo/beat2_402_challenge.tape -o demo/beat2_402_challenge.mp4

Output beat2_402_challenge.mp4

Set FontSize 20
Set Width 1440
Set Height 480
Set Theme "Dracula"
Set TypingSpeed 45ms
Set Padding 32
Set PlaybackSpeed 1.0

Type "curl -s https://kajota-hub.onrender.com/coach-okx/coach/premium | jq '.accepts[0]'"
Sleep 500ms
Enter
Sleep 4s

Type "# Live on Render. Network eip155:195 = XLayer. Real 402, real payTo."
Sleep 500ms
Enter
Sleep 2500ms
