# Beat 3 of the OKX.AI Genesis demo — REAL settlement authorization.
#
# What plays: the buyer's wallet CLI (`onchainos payment pay`) TEE-signs
# an EIP-3009 `transferWithAuthorization` against Coach's live 402
# challenge, returning a broadcastable authorization + signature that a
# facilitator submits on XLayer mainnet to move 0.01 USDT from the
# buyer wallet to Coach's payTo. Replaces the earlier static-slide
# Beat 3 with the actual protocol-layer artifact.
#
# The shell helper `beat3_pay.sh` handles a two-field in-flight patch
# (network/asset) that won't be needed once the hub env is set to
# production values; the signing/authorization flow is 100% real.
#
# Runtime target: ~28 seconds — matches the earlier 30 s Beat 3 slot.
#
# Render with:
#   vhs demo/beat3_settlement.tape

Output beat3_settlement.mp4

Set FontSize 18
Set Width 1600
Set Height 720
Set Theme "Dracula"
Set TypingSpeed 40ms
Set Padding 24

Type "# Buyer wallet TEE-signs an EIP-3009 auth against Coach's 402."
Sleep 800ms
Enter

Type "cat beat3_pay.sh   # what the demo runs"
Sleep 500ms
Enter
Sleep 4s

Type "./beat3_pay.sh"
Sleep 500ms
Enter
Sleep 8s

Type "# authorization + signature — ready to broadcast on XLayer mainnet."
Sleep 500ms
Enter
Sleep 3s
