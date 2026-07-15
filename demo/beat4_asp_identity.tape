# Beat 4 of the OKX.AI Genesis demo — the on-chain ASP identity.
#
# What plays: the operator runs `onchainos agent get-agents --agent-ids
# 5855` and the CLI prints the live ERC-8004 record on XLayer mainnet —
# name, role, approval status, avatar, description. Then jump to OKLink
# (recorded separately) to show the registration tx.
#
# Runtime target: ~10 seconds. Beat 4 is 18s; remainder is VO + cut to
# OKLink block-explorer screenshot with tx hash overlaid.
#
# Render with:
#   vhs demo/beat4_asp_identity.tape -o demo/beat4_asp_identity.mp4

Output beat4_asp_identity.mp4

Set FontSize 20
Set Width 1440
Set Height 540
Set Theme "Dracula"
Set TypingSpeed 45ms
Set Padding 32

Type "onchainos agent get-agents --agent-ids 5855 | jq '.data[0].card'"
Sleep 500ms
Enter
Sleep 5s

Type "# Kajota Coach — ASP 5855, XLayer mainnet, review passed AI quality check."
Sleep 500ms
Enter
Sleep 3s
