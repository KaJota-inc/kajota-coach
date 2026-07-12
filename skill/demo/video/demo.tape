# vhs script for the terminal beat. Render: vhs demo.tape
# (produces kajota-trade-terminal.mp4). Requires the kajota-mesh repo
# checked out at hackathon/ignyte-polygon.
Output kajota-trade-terminal.mp4
Set Shell zsh
Set FontSize 16
Set Width 1300
Set Height 940
Set Padding 30
Set Theme "Dracula"
Set TypingSpeed 28ms
Hide
Type "cd ~/Documents/kajota-mesh/packages/contracts && setopt interactivecomments && clear"
Enter
Show
Sleep 800ms
Type "# Kajota Trade - SME invoice financing, full lifecycle on-chain"
Enter
Sleep 1200ms
Type "pnpm demo:trade-finance 2>/dev/null"
Enter
Sleep 12s
