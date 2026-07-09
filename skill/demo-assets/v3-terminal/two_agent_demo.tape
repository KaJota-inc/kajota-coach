Output two_agent_demo.mp4

Set Shell "bash"
Set FontSize 15
Set Width 1600
Set Height 950
Set Padding 24
Set Theme "Catppuccin Mocha"
Set TypingSpeed 40ms

Type "cd ~/Documents/kajota-coach/skill"
Enter
Sleep 400ms
Type "SKILL_URL=http://localhost:8081 DEMO_PACE=0.9 .venv/bin/python examples/two_agent_demo.py"
Sleep 800ms
Enter
Sleep 55s
Enter
Sleep 800ms
