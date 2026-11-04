---
story_id: tokens
title: "I don't read words. I read pieces."
eyebrow: "Page 2 · How I read"
page_no: 2
description: "Type anything and watch a real tokenizer chop it into the pieces an AI actually reads."
choices:
  - to: understand
    title: "So do you actually understand any of this?"
    sub: "The honest answer"
  - to: confidence
    title: "First: why do you always sound so sure?"
    sub: "There's a dial for that"
    hide_if_read: true
deeper:
  slug: understanding-tokenization-methods
  label: "Understanding tokenization methods"
---

Before I see your message, it gets chopped into chunks called **tokens**. A token is often a whole common word. Sometimes it's part of a word, or a space glued to the front of one. <mark>I never see letters the way you do.</mark>

{% include story/toy-tokens.html %}

That's why I'm oddly bad at some easy things. Ask me how many r's are in *strawberry*. In the middle of a sentence, " strawberry" reaches me as a single token, number 101830. I never see s-t-r-a-w-b-e-r-r-y. I have to reason my way to an answer you can just see. Type it in above and look.
