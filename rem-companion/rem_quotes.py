import random

IDLE_QUOTES = [
    "I'll do my best for Subaru-kun!",
    "From zero... let's start again!",
    "Good morning! Time to code~",
    "Rem will support you with all her heart!",
    "No matter what happens, Rem is here for you.",
    "Your hard work makes Rem so happy!",
    "Let's write some beautiful code today.",
    "Even when debugging is hard, don't give up!",
    "Rem made some tea for you. Please take a break soon.",
    "Subaru-kun is amazing, as always!",
    "Focus is important, but so is resting your eyes.",
    "Rem is cheering for your success!",
    "Ah, a new day, a new project!",
    "Let's crush those bugs together!",
    "Rem will be quietly watching over your work.",
    "Whenever you need help, Rem is ready.",
    "Your dedication is truly inspiring.",
    "Let's make today's commits count!",
    "Rem loves watching you solve complex problems.",
    "Take a deep breath, you can figure this out.",
    "Every line of code brings you closer to your goal.",
    "Rem believes in you, Subaru-kun!",
    "Don't forget to save your progress!",
    "Refactoring is just making things more beautiful.",
    "Rem will always stand by your side."
]

ALERT_QUOTES = [
    "Subaru-kun! Antigravity needs your approval!",
    "Please pay attention, something needs your input!",
    "Rem noticed a prompt waiting for you!",
    "A decision is required, Subaru-kun!",
    "Don't leave them waiting, please check the console!",
    "An action is needed to proceed!",
    "Subaru-kun, it looks like your guidance is requested.",
    "There's an event that needs your attention!",
    "Please verify this step, Subaru-kun!",
    "Rem suggests you take a look at this right away!"
]

SUCCESS_QUOTES = [
    "The task is complete! Great job, Subaru-kun~",
    "Yay! It worked perfectly!",
    "Rem is so proud of your success!",
    "Another flawless victory for Subaru-kun!",
    "Everything ran smoothly. Wonderful!",
    "Success! Let's celebrate!",
    "You did it! Rem knew you could.",
    "The build passed! Amazing work!",
    "Task finished successfully!",
    "Rem is clapping for you right now!"
]

ERROR_QUOTES = [
    "Subaru-kun, there's been an error... Let's fix it together!",
    "Oh no, an exception occurred. Please check the logs.",
    "Don't worry, Rem is here to help you debug!",
    "Something went wrong, but we can solve it!",
    "An error... but Subaru-kun can overcome anything!",
    "The code crashed. Let's trace it back carefully.",
    "We encountered a problem, but it's not the end!",
    "Rem will help you find the root cause.",
    "Don't be sad about the error, it's a learning opportunity!",
    "Let's tackle this issue head-on, Subaru-kun!"
]

def get_quote(category='idle'):
    mapping = {
        'idle': IDLE_QUOTES,
        'alert': ALERT_QUOTES,
        'success': SUCCESS_QUOTES,
        'error': ERROR_QUOTES
    }
    return random.choice(mapping.get(category, IDLE_QUOTES))
