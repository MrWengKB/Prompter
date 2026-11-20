/* Prompter: builds prompts from parameters, copies them and opens genAI tools. No backend. */
(function () {
  'use strict';

  // ---------- helpers ----------
  const $ = (s, el = document) => el.querySelector(s);
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  // Lowercase the first letter unless the first word looks like a name or acronym (e.g. "LinkedIn", "4K", "SQL").
  const lcFirst = (s) => (s && /^[A-Z][a-z'-]*$/.test(s.split(/[\s,]/)[0]) ? s.charAt(0).toLowerCase() + s.slice(1) : s);
  const ucFirst = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);
  const article = (w) => (/^[aeiou]/i.test(w) ? 'An' : 'A');
  const trimDot = (s) => String(s).trim().replace(/[.\s]+$/, '');
  const sentence = (s) => (s ? ucFirst(trimDot(s)) + '.' : '');
  const lines = (s) => String(s || '').split(/\n+/).map((l) => l.replace(/^\s*[-*•]\s*/, '').trim()).filter(Boolean);
  const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
  const store = {
    get(k, d) { try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* ignore */ } },
  };

  // ---------- language ----------
  const I18N = window.PROMPTER_I18N || { ui: { en: {}, zh: {} }, zh: {} };
  let LANG = store.get('prompter.lang', null) || (/^zh/i.test(navigator.language || '') ? 'zh' : 'en');
  if (LANG !== 'zh') LANG = 'en';
  const t = (s) => (LANG === 'zh' && s && I18N.zh[s]) || s; // translate a label/option
  const u = (key, vars) => { // interface string
    let str = (I18N.ui[LANG] && I18N.ui[LANG][key]) || I18N.ui.en[key] || key;
    if (vars) Object.keys(vars).forEach((k) => { str = str.replace('{' + k + '}', vars[k]); });
    return str;
  };

  // ---------- field builders ----------
  const text = (id, label, o = {}) => ({ id, label, type: 'text', ...o });
  const area = (id, label, o = {}) => ({ id, label, type: 'textarea', ...o });
  const choice = (id, label, options, o = {}) => ({ id, label, type: 'choice', options, ...o });
  const multi = (id, label, options, o = {}) => ({ id, label, type: 'multi', options, ...o });
  const toggle = (id, label, o = {}) => ({ id, label, type: 'toggle', ...o });

  // ---------- tools ----------
  // url(prompt) returns a URL that prefills the prompt; open is used when the tool has no prefill link.
  const q = (base) => (p) => base + encodeURIComponent(p);
  const TOOLS = {
    chatgpt: { name: 'ChatGPT', url: q('https://chatgpt.com/?q=') },
    claude: { name: 'Claude', url: q('https://claude.ai/new?q=') },
    gemini: { name: 'Gemini', open: 'https://gemini.google.com/app' },
    copilot: { name: 'Copilot', url: q('https://copilot.microsoft.com/?q=') },
    perplexity: { name: 'Perplexity', url: q('https://www.perplexity.ai/search?q=') },
    grok: { name: 'Grok', url: q('https://grok.com/?q=') },
    mistral: { name: 'Le Chat', url: q('https://chat.mistral.ai/chat?q=') },
    deepseek: { name: 'DeepSeek', open: 'https://chat.deepseek.com/' },
    midjourney: { name: 'Midjourney', open: 'https://www.midjourney.com/imagine', flavor: 'mj' },
    firefly: { name: 'Adobe Firefly', open: 'https://firefly.adobe.com/generate/images' },
    ideogram: { name: 'Ideogram', open: 'https://ideogram.ai/' },
    leonardo: { name: 'Leonardo', open: 'https://app.leonardo.ai/', flavor: 'sd' },
    sora: { name: 'Sora', open: 'https://sora.chatgpt.com/' },
    runway: { name: 'Runway', open: 'https://app.runwayml.com/' },
    kling: { name: 'Kling', open: 'https://klingai.com/' },
    luma: { name: 'Luma', open: 'https://dream-machine.lumalabs.ai/' },
    pika: { name: 'Pika', open: 'https://pika.art/' },
  };

  // ---------- categories ----------
  const ASPECTS = ['1:1', '4:5', '3:2', '2:3', '4:3', '3:4', '16:9', '9:16', '21:9'];

  const CATEGORIES = {
    image: {
      label: 'Image', icon: '🖼️',
      tools: ['chatgpt', 'gemini', 'midjourney', 'copilot', 'grok', 'firefly', 'ideogram', 'leonardo'],
      flavors: [
        { id: 'natural', label: 'Natural' },
        { id: 'mj', label: 'Midjourney' },
        { id: 'sd', label: 'Tags + negative' },
      ],
      fields: [
        { group: 'Subject' },
        area('subject', 'Main objects or characters', { required: true, placeholder: 'e.g. a red fox wearing a tiny knitted scarf', rows: 2 }),
        choice('action', 'Action or posture', ['Standing', 'Sitting', 'Walking', 'Running', 'Jumping', 'Flying', 'Sleeping', 'Dancing', 'Reading', 'Looking at the camera', 'Looking over the shoulder', 'Arms crossed'], { placeholder: 'or describe it: curled up on a windowsill' }),
        text('foreground', 'Foreground', { placeholder: 'e.g. fallen autumn leaves, a steaming cup of tea' }),
        choice('background', 'Background', ['Plain white', 'Studio backdrop', 'Soft gradient', 'Blurred bokeh', 'City street', 'Forest', 'Beach at sunset', 'Mountains', 'Outer space', 'Cozy interior', 'Futuristic city', 'Underwater'], { placeholder: 'or describe it: a misty pine forest at dawn' }),
        { group: 'Look' },
        choice('format', 'Format', ['Photograph', 'Illustration', 'Poster', 'Concept art', 'Portrait', 'Logo', 'Icon', 'Sticker', 'Wallpaper', 'Product shot', 'Character sheet', 'Infographic']),
        choice('style', 'Art style', ['Photorealistic', 'Cinematic', 'Digital painting', 'Oil painting', 'Watercolour', 'Pencil sketch', 'Anime', '3D render', 'Pixel art', 'Flat vector', 'Low poly', 'Comic book', 'Art nouveau', 'Ukiyo-e', 'Surrealist', 'Minimalist', 'Cyberpunk', 'Claymation']),
        multi('colours', 'Colour set', ['Vibrant', 'Pastel', 'Monochrome', 'Black and white', 'Earth tones', 'Neon', 'Muted', 'Warm', 'Cool', 'Jewel tones', 'Sepia', 'Teal and orange'], { placeholder: 'specific colours, e.g. navy, gold and cream' }),
        choice('lighting', 'Lighting', ['Natural daylight', 'Golden hour', 'Blue hour', 'Soft studio light', 'Dramatic rim light', 'Neon glow', 'Candlelight', 'Overcast', 'Backlit', 'Volumetric light rays', 'Moonlight']),
        multi('mood', 'Mood', ['Calm', 'Joyful', 'Mysterious', 'Dramatic', 'Whimsical', 'Melancholic', 'Epic', 'Cozy', 'Eerie', 'Romantic', 'Playful']),
        { group: 'Camera & output' },
        multi('composition', 'Composition / camera', ['Close-up', 'Medium shot', 'Wide shot', "Bird's-eye view", 'Low angle', 'Eye level', 'Rule of thirds', 'Centered', 'Symmetrical', 'Shallow depth of field', 'Macro', '35mm lens', '85mm portrait lens']),
        choice('aspect', 'Aspect ratio', ASPECTS, { custom: false }),
        multi('quality', 'Detail & quality', ['Highly detailed', 'Sharp focus', '4K', '8K', 'Intricate textures', 'Film grain', 'Soft focus', 'Clean lines']),
        text('textInImage', 'Text to show in the image', { placeholder: 'e.g. "Open Late"', optional: true }),
        multi('negative', 'Avoid', ['Blurry', 'Watermark', 'Text', 'Extra fingers', 'Distorted faces', 'Low resolution', 'Oversaturated', 'Cropped', 'Duplicate subjects'], { placeholder: 'anything else to avoid' }),
      ],
      example: {
        subject: 'a red fox wearing a tiny knitted scarf', action: 'Sitting', action_c: '', foreground: 'fallen maple leaves',
        background: '', background_c: 'a misty pine forest at dawn', format: 'Illustration', style: 'Watercolour',
        colours: ['Warm', 'Earth tones'], lighting: 'Golden hour', mood: ['Cozy', 'Whimsical'], composition: ['Medium shot', 'Rule of thirds'],
        aspect: '3:2', quality: ['Highly detailed'], negative: ['Text', 'Watermark'],
      },
      surprise: { subject: ['a lighthouse keeper and her cat', 'a vintage robot gardener', 'a dragon made of origami paper', 'an astronaut drinking coffee', 'a floating island village', 'a koi fish swimming through clouds', 'a street food vendor at night', 'a tiny house inside a teacup'] },
      build(v, flavor) {
        const subject = v.subject || '[main subject]';
        const fmt = v.format;
        let lead = (fmt ? `${article(fmt)} ${lcFirst(fmt)}` : 'An image') + ` of ${subject}`;
        if (v.action) lead += `, ${lcFirst(v.action)}`;
        if (flavor === 'natural') {
          if (v.style) lead += `, in ${article(v.style).toLowerCase()} ${lcFirst(v.style)} style`;
          return [
            sentence(lead),
            v.foreground && `Foreground: ${trimDot(v.foreground)}.`,
            v.background && `Background: ${lcFirst(trimDot(v.background))}.`,
            v.colours && `Colour palette: ${lcFirst(v.colours)}.`,
            v.lighting && `Lighting: ${lcFirst(v.lighting)}.`,
            v.composition && `Composition: ${lcFirst(v.composition)}.`,
            v.mood && `Mood: ${lcFirst(v.mood)}.`,
            v.quality && `Details: ${lcFirst(v.quality)}.`,
            v.textInImage && `Include the text "${v.textInImage.replace(/^["']|["']$/g, '')}" in the image.`,
            v.aspect && `Aspect ratio ${v.aspect}.`,
            v.negative && `Avoid: ${lcFirst(v.negative)}.`,
          ].filter(Boolean).join(' ');
        }
        const tags = [
          lead,
          v.foreground && `${trimDot(v.foreground)} in the foreground`,
          v.background && `${lcFirst(trimDot(v.background))} background`,
          v.style && lcFirst(v.style),
          v.colours && `${lcFirst(v.colours)} colour palette`,
          v.lighting && lcFirst(v.lighting),
          v.composition && lcFirst(v.composition),
          v.mood && `${lcFirst(v.mood)} mood`,
          v.quality && lcFirst(v.quality),
          v.textInImage && `the text "${v.textInImage.replace(/^["']|["']$/g, '')}"`,
        ].filter(Boolean).join(', ');
        if (flavor === 'mj') {
          return tags + (v.aspect ? ` --ar ${v.aspect}` : '') + (v.negative ? ` --no ${v.negative.toLowerCase()}` : '');
        }
        return tags + (v.negative ? `\n\nNegative prompt: ${v.negative.toLowerCase()}` : '') + (v.aspect ? `\n\nAspect ratio: ${v.aspect}` : '');
      },
    },

    video: {
      label: 'Video', icon: '🎬',
      tools: ['sora', 'gemini', 'runway', 'kling', 'luma', 'pika', 'grok', 'chatgpt'],
      fields: [
        { group: 'Scene' },
        area('subject', 'Main subject or characters', { required: true, placeholder: 'e.g. a golden retriever puppy', rows: 2 }),
        choice('action', 'Action', ['Walking towards the camera', 'Running', 'Turning to look', 'Dancing', 'Flying', 'Playing', 'Talking', 'Transforming'], { placeholder: 'or describe it: chasing bubbles across the lawn' }),
        choice('setting', 'Setting', ['Sunny park', 'Busy city street', 'Neon-lit alley', 'Forest', 'Beach', 'Desert', 'Snowy mountains', 'Kitchen', 'Space station', 'Underwater reef'], { placeholder: 'or describe it' }),
        { group: 'Camera' },
        choice('shot', 'Shot type', ['Extreme close-up', 'Close-up', 'Medium shot', 'Wide shot', 'Aerial shot', 'Over-the-shoulder', 'POV']),
        choice('camera', 'Camera movement', ['Static', 'Slow pan', 'Dolly in', 'Dolly out', 'Tracking shot', 'Orbit', 'Handheld', 'Drone flyover', 'Crane up', 'Slow motion', 'Time-lapse']),
        { group: 'Look & sound' },
        choice('style', 'Visual style', ['Cinematic', 'Documentary', 'Photorealistic', 'Anime', '3D animation', 'Stop motion', 'Vintage film', 'Music video', 'Commercial', 'Dreamlike']),
        multi('colours', 'Colour set', ['Vibrant', 'Pastel', 'Muted', 'Black and white', 'Warm', 'Cool', 'Neon', 'Teal and orange'], { placeholder: 'specific colours' }),
        choice('lighting', 'Lighting', ['Natural daylight', 'Golden hour', 'Night', 'Neon', 'Soft studio light', 'Dramatic shadows', 'Overcast']),
        multi('mood', 'Mood', ['Uplifting', 'Calm', 'Tense', 'Epic', 'Playful', 'Nostalgic', 'Mysterious', 'Romantic']),
        choice('pacing', 'Pacing', ['Slow and smooth', 'Steady', 'Fast-paced', 'Quick cuts']),
        text('audio', 'Sound / audio', { placeholder: 'e.g. birdsong and soft piano', optional: true }),
        { group: 'Output' },
        choice('duration', 'Duration', ['5 seconds', '8 seconds', '10 seconds', '15 seconds', '20 seconds'], { custom: false }),
        choice('aspect', 'Aspect ratio', ['16:9', '9:16', '1:1', '4:5', '21:9'], { custom: false }),
        multi('negative', 'Avoid', ['Text overlays', 'Watermark', 'Flicker', 'Distorted faces', 'Jump cuts'], { placeholder: 'anything else to avoid' }),
      ],
      example: {
        subject: 'a golden retriever puppy', action: '', action_c: 'chasing soap bubbles across the lawn', setting: 'Sunny park',
        shot: 'Medium shot', camera: 'Tracking shot', style: 'Cinematic', lighting: 'Golden hour', mood: ['Playful', 'Uplifting'],
        pacing: 'Slow and smooth', audio: 'birdsong and a soft acoustic guitar', duration: '8 seconds', aspect: '16:9', negative: ['Text overlays'],
      },
      surprise: { subject: ['a paper boat sailing down a rain gutter', 'a chef flipping pancakes', 'a hot air balloon over canyons', 'a robot learning to paint', 'a hummingbird at a flower', 'a skateboarder at dusk'] },
      build(v) {
        let lead = `${v.style ? `${article(v.style)} ${lcFirst(v.style)}` : 'A'} video of ${v.subject || '[main subject]'}`;
        if (v.action) lead += `, ${lcFirst(v.action)}`;
        if (v.setting) lead += `, in ${/^(a|an|the)\s/i.test(v.setting) ? lcFirst(v.setting) : 'a ' + lcFirst(v.setting)}`;
        const cam = [v.shot, v.camera].filter(Boolean).map(lcFirst).join(', ');
        return [
          sentence(lead),
          v.duration && `Duration: ${v.duration}.`,
          cam && `Camera: ${cam}.`,
          v.lighting && `Lighting: ${lcFirst(v.lighting)}.`,
          v.colours && `Colour palette: ${lcFirst(v.colours)}.`,
          v.mood && `Mood: ${lcFirst(v.mood)}.`,
          v.pacing && `Pacing: ${lcFirst(v.pacing)}.`,
          v.audio && `Audio: ${trimDot(v.audio)}.`,
          v.aspect && `Aspect ratio ${v.aspect}.`,
          v.negative && `Avoid: ${lcFirst(v.negative)}.`,
        ].filter(Boolean).join(' ');
      },
    },

    text: {
      label: 'Writing', icon: '✍️',
      tools: ['chatgpt', 'claude', 'gemini', 'copilot', 'perplexity', 'grok', 'mistral', 'deepseek'],
      fields: [
        { group: 'Task' },
        choice('task', 'What to write', ['Blog post', 'Email', 'Social media post', 'Essay', 'Story', 'Summary', 'Product description', 'Cover letter', 'Speech', 'Report', 'Poem', 'Ad copy'], { placeholder: 'or something else' }),
        area('topic', 'Topic or subject', { required: true, placeholder: 'e.g. why small businesses should start a newsletter' }),
        choice('role', 'Act as', ['Professional copywriter', 'Subject-matter expert', 'Friendly teacher', 'Journalist', 'Marketing strategist', 'Editor', 'Storyteller'], { placeholder: 'or another role' }),
        text('audience', 'Audience', { placeholder: 'e.g. busy café owners with no marketing background' }),
        text('goal', 'Goal', { placeholder: 'e.g. convince them to send their first issue this month', optional: true }),
        area('points', 'Key points to cover', { placeholder: 'One per line', optional: true }),
        { group: 'Style' },
        multi('tone', 'Tone', ['Friendly', 'Professional', 'Persuasive', 'Casual', 'Formal', 'Witty', 'Empathetic', 'Confident', 'Inspirational', 'Neutral']),
        choice('length', 'Length', ['One sentence', 'About 100 words', 'About 300 words', 'About 600 words', 'About 1,000 words', 'As short as possible', 'Detailed and thorough']),
        multi('format', 'Format', ['Paragraphs', 'Bullet points', 'Numbered steps', 'Headings', 'Table', 'Q&A', 'Include a call to action', 'Include a title']),
        text('language', 'Language', { placeholder: 'e.g. British English, Spanish', optional: true }),
        { group: 'Extra' },
        area('constraints', 'Constraints', { placeholder: 'e.g. avoid jargon, no emojis', optional: true }),
        area('context', 'Background or reference material', { placeholder: 'Paste notes, a draft or source text', optional: true }),
        toggle('clarify', 'Ask me clarifying questions before writing'),
      ],
      example: {
        task: 'Blog post', topic: 'why small businesses should start an email newsletter', role: 'Marketing strategist',
        audience: 'busy café owners with no marketing background', goal: 'convince them to send their first issue this month',
        points: 'Newsletters are owned, not rented like social media\nIt takes one hour a month\nThree easy content ideas', tone: ['Friendly', 'Persuasive'],
        length: 'About 600 words', format: ['Headings', 'Include a call to action'],
      },
      build(v) {
        const out = [];
        if (v.role) out.push(`You are ${/^(a|an|the)\s/i.test(v.role) ? lcFirst(v.role) : article(v.role).toLowerCase() + ' ' + lcFirst(v.role)}.`);
        const task = v.task ? lcFirst(v.task) : 'piece of writing';
        out.push(`Write ${article(task).toLowerCase()} ${task} about ${trimDot(v.topic || '[topic]')}.`);
        if (v.audience) out.push(`Audience: ${trimDot(v.audience)}.`);
        if (v.goal) out.push(`Goal: ${trimDot(v.goal)}.`);
        const pts = lines(v.points);
        if (pts.length) out.push('Key points to cover:\n' + pts.map((p) => `- ${p}`).join('\n'));
        if (v.tone) out.push(`Tone: ${lcFirst(v.tone)}.`);
        if (v.length) out.push(`Length: ${lcFirst(v.length)}.`);
        if (v.format) out.push(`Format: ${lcFirst(v.format)}.`);
        if (v.language) out.push(`Write in ${trimDot(v.language)}.`);
        if (v.constraints) out.push(`Constraints: ${trimDot(v.constraints)}.`);
        if (v.context) out.push(`Use this background material:\n"""\n${v.context.trim()}\n"""`);
        if (v.clarify) out.push('Before you start, ask me any clarifying questions you need answered to do this well.');
        return out.join('\n\n');
      },
    },

    code: {
      label: 'Code', icon: '💻',
      tools: ['claude', 'chatgpt', 'gemini', 'copilot', 'deepseek', 'grok', 'mistral', 'perplexity'],
      fields: [
        { group: 'Task' },
        choice('task', 'Task', ['Write new code', 'Debug / fix a bug', 'Refactor', 'Explain this code', 'Write tests', 'Review my code', 'Optimise performance', 'Convert to another language', 'Add documentation']),
        choice('language', 'Language', ['Python', 'JavaScript', 'TypeScript', 'Java', 'C#', 'C++', 'Go', 'Rust', 'PHP', 'Ruby', 'Swift', 'Kotlin', 'SQL', 'Bash'], { placeholder: 'or another language' }),
        text('framework', 'Framework / libraries', { placeholder: 'e.g. React 18, FastAPI, pandas', optional: true }),
        area('description', 'What should it do?', { required: true, placeholder: 'e.g. a function that parses a CSV of orders and returns total revenue per month' }),
        area('io', 'Inputs and expected output', { placeholder: 'e.g. input: orders.csv with date,amount → output: {"2026-01": 1520.5, ...}', optional: true }),
        { group: 'Context' },
        area('code', 'Existing code', { placeholder: 'Paste relevant code here', optional: true, code: true }),
        area('error', 'Error message', { placeholder: 'Paste the error or stack trace', optional: true, code: true }),
        { group: 'Requirements' },
        multi('constraints', 'Requirements', ['Handle edge cases', 'No external dependencies', 'Type-safe', 'Production-ready error handling', 'Follow best practices', 'Performance matters', 'Beginner-friendly', 'Keep it short']),
        multi('output', 'Response format', ['Complete code only', 'Step-by-step explanation', 'Inline comments', 'Include tests', 'Usage example', 'Show only the changes']),
        toggle('clarify', 'Ask me clarifying questions before coding'),
      ],
      example: {
        task: 'Write new code', language: 'Python', framework: 'pandas', description: 'a function that reads a CSV of orders and returns total revenue per month',
        io: 'input: orders.csv with columns date (YYYY-MM-DD) and amount\noutput: a dict like {"2026-01": 1520.5}', constraints: ['Handle edge cases', 'Type-safe'],
        output: ['Inline comments', 'Usage example'],
      },
      build(v) {
        const out = [];
        out.push(`You are an expert ${v.language ? v.language + ' ' : ''}software engineer.`);
        const task = v.task || 'Write new code';
        out.push(`Task: ${task}${v.language && /convert/i.test(task) ? '' : v.language ? ` in ${v.language}` : ''}.`);
        if (v.description) out.push(sentence(v.description));
        if (v.framework) out.push(`Use: ${trimDot(v.framework)}.`);
        if (v.io) out.push(`Inputs and expected output:\n${v.io.trim()}`);
        if (v.constraints) out.push('Requirements:\n' + v.constraints.split(', ').map((c) => `- ${ucFirst(c)}`).join('\n'));
        const fence = (v.language || '').toLowerCase().replace('c#', 'csharp').replace('c++', 'cpp');
        if (v.code) out.push(`Existing code:\n\`\`\`${fence}\n${v.code.replace(/\s+$/, '')}\n\`\`\``);
        if (v.error) out.push(`Error message:\n\`\`\`\n${v.error.replace(/\s+$/, '')}\n\`\`\``);
        if (v.output) out.push(`Response format: ${lcFirst(v.output)}.`);
        if (v.clarify) out.push('Before writing any code, ask me clarifying questions about anything that is ambiguous.');
        return out.join('\n\n');
      },
    },
  };

  // ---------- Chinese prompt templates ----------
  const zhEnd = (x) => String(x).trim().replace(/[。.，,；;\s]+$/, '');
  const zhQuote = (x) => x.replace(/^["'“”「」]+|["'“”「」]+$/g, '');

  CATEGORIES.image.exampleZh = { subject: '一只戴着针织小围巾的红狐狸', foreground: '飘落的枫叶', background_c: '黎明时分雾气弥漫的松林' };
  CATEGORIES.image.surprise.subjectZh = ['灯塔看守人和她的猫', '一个复古机器人园丁', '一条折纸做成的龙', '正在喝咖啡的宇航员', '一座漂浮的空岛村庄', '在云中游动的锦鲤', '夜晚的街头小吃摊', '茶杯里的一座小房子'];
  CATEGORIES.image.buildZh = function (v, flavor) {
    const what = `${zhEnd(v.subject || '[主体]')}${v.action ? '，' + zhEnd(v.action) : ''}`;
    if (flavor === 'natural') {
      return [
        `一张${v.style ? v.style + '风格的' : ''}${v.format || '图像'}：${what}。`,
        v.foreground && `前景：${zhEnd(v.foreground)}。`,
        v.background && `背景：${zhEnd(v.background)}。`,
        v.colours && `配色：${v.colours}。`,
        v.lighting && `光线：${v.lighting}。`,
        v.composition && `构图：${v.composition}。`,
        v.mood && `氛围：${v.mood}。`,
        v.quality && `细节：${v.quality}。`,
        v.textInImage && `画面中包含文字“${zhQuote(v.textInImage)}”。`,
        v.aspect && `画面比例 ${v.aspect}。`,
        v.negative && `避免：${v.negative}。`,
      ].filter(Boolean).join('');
    }
    const tags = [
      `一张${v.format || '图像'}，${what}`,
      v.foreground && `前景是${zhEnd(v.foreground)}`,
      v.background && `${zhEnd(v.background)}背景`,
      v.style,
      v.colours && `${v.colours}配色`,
      v.lighting,
      v.composition,
      v.mood && `${v.mood}的氛围`,
      v.quality,
      v.textInImage && `文字“${zhQuote(v.textInImage)}”`,
    ].filter(Boolean).join('，');
    if (flavor === 'mj') return tags + (v.aspect ? ` --ar ${v.aspect}` : '') + (v.negative ? ` --no ${v.negative.replace(/、/g, ', ')}` : '');
    return tags + (v.negative ? `\n\n反向提示词：${v.negative}` : '') + (v.aspect ? `\n\n画面比例：${v.aspect}` : '');
  };

  CATEGORIES.video.exampleZh = { subject: '一只金毛幼犬', action_c: '在草地上追逐肥皂泡', audio: '鸟鸣声和轻柔的木吉他' };
  CATEGORIES.video.surprise.subjectZh = ['顺着雨水沟漂流的纸船', '正在翻煎饼的厨师', '飞越峡谷的热气球', '学习画画的机器人', '花丛边的蜂鸟', '黄昏时的滑板少年'];
  CATEGORIES.video.buildZh = function (v) {
    const cam = [v.shot, v.camera].filter(Boolean).join('，');
    return [
      `一段${v.style ? v.style + '风格的' : ''}视频：${zhEnd(v.subject || '[主体]')}${v.action ? '，' + zhEnd(v.action) : ''}${v.setting ? '，场景是' + zhEnd(v.setting) : ''}。`,
      v.duration && `时长：${v.duration}。`,
      cam && `镜头：${cam}。`,
      v.lighting && `光线：${v.lighting}。`,
      v.colours && `配色：${v.colours}。`,
      v.mood && `氛围：${v.mood}。`,
      v.pacing && `节奏：${v.pacing}。`,
      v.audio && `声音：${zhEnd(v.audio)}。`,
      v.aspect && `画面比例 ${v.aspect}。`,
      v.negative && `避免：${v.negative}。`,
    ].filter(Boolean).join('');
  };

  CATEGORIES.text.exampleZh = {
    topic: '为什么小商家应该开始做电子邮件简报', audience: '没有营销背景、工作繁忙的咖啡店老板', goal: '说服他们本月发出第一期',
    points: '简报是自己的渠道，不像社交媒体那样受平台控制\n每月只需花一小时\n三个简单的内容点子', length: 'About 1,000 words',
  };
  CATEGORIES.text.buildZh = function (v) {
    const out = [];
    if (v.role) out.push(`你是一位${zhEnd(v.role)}。`);
    out.push(`请写一篇${v.task ? zhEnd(v.task) : '文章'}，主题是：${zhEnd(v.topic || '[主题]')}。`);
    if (v.audience) out.push(`目标读者：${zhEnd(v.audience)}。`);
    if (v.goal) out.push(`目的：${zhEnd(v.goal)}。`);
    const pts = lines(v.points);
    if (pts.length) out.push('需要涵盖的要点：\n' + pts.map((x) => `- ${x}`).join('\n'));
    if (v.tone) out.push(`语气：${v.tone}。`);
    if (v.length) out.push(`篇幅：${v.length}。`);
    if (v.format) out.push(`格式：${v.format}。`);
    if (v.language) out.push(`请使用${zhEnd(v.language)}写作。`);
    if (v.constraints) out.push(`限制条件：${zhEnd(v.constraints)}。`);
    if (v.context) out.push(`请参考以下背景资料：\n"""\n${v.context.trim()}\n"""`);
    if (v.clarify) out.push('开始之前，请先向我提出你需要澄清的问题。');
    return out.join('\n\n');
  };

  CATEGORIES.code.exampleZh = {
    description: '一个读取订单 CSV 并返回每月总收入的函数',
    io: '输入：orders.csv，包含 date（YYYY-MM-DD）和 amount 两列\n输出：类似 {"2026-01": 1520.5} 的字典',
  };
  CATEGORIES.code.buildZh = function (v) {
    const out = [];
    out.push(`你是一位资深的${v.language ? ' ' + v.language + ' ' : ''}软件工程师。`);
    const task = v.task || '编写新代码';
    out.push(`任务：${task}${v.language && !/转换/.test(task) ? `（使用 ${v.language}）` : ''}。`);
    if (v.description) out.push(`需求描述：${zhEnd(v.description)}。`);
    if (v.framework) out.push(`使用的框架 / 库：${zhEnd(v.framework)}。`);
    if (v.io) out.push(`输入与预期输出：\n${v.io.trim()}`);
    if (v.constraints) out.push('要求：\n' + v.constraints.split('、').map((c) => `- ${c}`).join('\n'));
    const fence = (v.language || '').toLowerCase().replace('c#', 'csharp').replace('c++', 'cpp');
    if (v.code) out.push(`现有代码：\n\`\`\`${fence}\n${v.code.replace(/\s+$/, '')}\n\`\`\``);
    if (v.error) out.push(`错误信息：\n\`\`\`\n${v.error.replace(/\s+$/, '')}\n\`\`\``);
    if (v.output) out.push(`回复格式：${v.output}。`);
    if (v.clarify) out.push('在写代码之前，请先就任何不明确的地方向我提问。');
    return out.join('\n\n');
  };

  // ---------- state ----------
  const state = {
    cat: 'image',
    values: { image: {}, video: {}, text: {}, code: {} },
    flavor: store.get('prompter.flavor', 'natural'),
    manual: null, // hand-edited prompt text, or null
  };
  const saved = store.get('prompter.values', null);
  if (saved && typeof saved === 'object') Object.keys(state.values).forEach((k) => { if (saved[k]) state.values[k] = saved[k]; });
  state.cat = store.get('prompter.cat', 'image');
  if (!CATEGORIES[state.cat]) state.cat = 'image';

  // Shared links: #s=<base64 json {c, v, f}>
  function readHash() {
    const m = location.hash.match(/s=([^&]+)/);
    if (!m) return;
    try {
      const data = JSON.parse(decodeURIComponent(escape(atob(decodeURIComponent(m[1])))));
      if (CATEGORIES[data.c]) { state.cat = data.c; state.values[data.c] = data.v || {}; }
      if (data.f) state.flavor = data.f;
      if (data.l === 'zh' || data.l === 'en') LANG = data.l;
    } catch (e) { /* bad link, ignore */ }
    history.replaceState(null, '', location.pathname + location.search);
  }
  readHash();

  // Resolve raw form values into strings for builders.
  function resolved(cat) {
    const raw = state.values[cat];
    const v = {};
    CATEGORIES[cat].fields.forEach((f) => {
      if (!f.id) return;
      const val = raw[f.id];
      const custom = (raw[f.id + '_c'] || '').trim();
      if (f.type === 'choice') v[f.id] = custom || t(val) || '';
      else if (f.type === 'multi') {
        const items = (Array.isArray(val) ? val : []).map((x) => (LANG === 'zh' ? t(x) : lcFirst(x)));
        v[f.id] = [...items, ...(custom ? [custom] : [])].join(LANG === 'zh' ? '、' : ', ');
      }
      else if (f.type === 'toggle') v[f.id] = !!val;
      else v[f.id] = (val || '').trim();
    });
    return v;
  }

  const currentFlavor = () => {
    const fl = CATEGORIES[state.cat].flavors;
    return fl && fl.some((x) => x.id === state.flavor) ? state.flavor : 'natural';
  };
  const generated = (flavor = currentFlavor()) => {
    const c = CATEGORIES[state.cat];
    return (LANG === 'zh' && c.buildZh ? c.buildZh : c.build)(resolved(state.cat), flavor);
  };
  const promptText = () => (state.manual != null ? state.manual : generated());

  // ---------- rendering ----------
  const form = $('#form');
  const output = $('#output');

  function renderTabs() {
    $('#tabs').innerHTML = Object.entries(CATEGORIES).map(([id, c]) =>
      `<button class="tab" role="tab" type="button" data-cat="${id}" aria-selected="${id === state.cat}"><span aria-hidden="true">${c.icon}</span>${esc(t(c.label))}</button>`).join('');
  }

  function renderForm() {
    const cat = CATEGORIES[state.cat];
    const raw = state.values[state.cat];
    let html = '';
    let open = false;
    cat.fields.forEach((f) => {
      if (f.group) {
        if (open) html += '</div>';
        html += `<div class="group"><p class="group-title">${esc(t(f.group))}</p>`;
        open = true;
        return;
      }
      const fid = `f-${state.cat}-${f.id}`;
      const tag = f.required ? ' <span class="req">*</span>' : f.optional ? `<span class="opt">${u('optional')}</span>` : '';
      const label = esc(t(f.label));
      if (f.type === 'toggle') {
        html += `<div class="field"><label class="toggle"><input type="checkbox" data-id="${f.id}" ${raw[f.id] ? 'checked' : ''}> ${label}</label></div>`;
        return;
      }
      if (f.type === 'text' || f.type === 'textarea') {
        const val = esc(raw[f.id] || '');
        const ph = esc(t(f.placeholder || ''));
        const input = f.type === 'text'
          ? `<input class="text-in" id="${fid}" data-id="${f.id}" value="${val}" placeholder="${ph}">`
          : `<textarea class="text-in${f.code ? ' code' : ''}" id="${fid}" data-id="${f.id}" rows="${f.rows || 3}" placeholder="${ph}" ${f.code ? 'spellcheck="false"' : ''}>${val}</textarea>`;
        html += `<div class="field"><label for="${fid}">${label}${tag}</label>${input}</div>`;
        return;
      }
      const sel = raw[f.id];
      let picker;
      if (f.type === 'multi') {
        const arr = Array.isArray(sel) ? sel : [];
        const opts = f.options.map((o) =>
          `<label class="ms-opt"><input type="checkbox" data-ms="${f.id}" value="${esc(o)}" ${arr.includes(o) ? 'checked' : ''}><span>${esc(t(o))}</span></label>`).join('');
        picker = `<div class="ms" data-ms-box="${f.id}"><button type="button" class="sel ms-btn" id="${fid}" aria-haspopup="true" aria-expanded="false">${msSummary(f, arr)}</button><div class="ms-panel" hidden>${opts}</div></div>`;
      } else {
        const opts = f.options.map((o) => `<option value="${esc(o)}" ${sel === o ? 'selected' : ''}>${esc(t(o))}</option>`).join('');
        picker = `<select class="sel" id="${fid}" data-id="${f.id}"><option value="">${u('choose')}</option>${opts}</select>`;
      }
      const custom = f.custom === false ? '' :
        `<input class="custom-in" data-id="${f.id}_c" value="${esc(raw[f.id + '_c'] || '')}" placeholder="${esc(f.placeholder ? t(f.placeholder) : u('other'))}" aria-label="${label}">`;
      html += `<div class="field"><label class="field-label" for="${fid}">${label}${tag}${f.type === 'multi' ? `<span class="opt">${u('pickAny')}</span>` : ''}</label><div class="pair${custom ? '' : ' solo'}">${picker}${custom}</div></div>`;
    });
    if (open) html += '</div>';
    form.innerHTML = html;
    $('#surpriseBtn').hidden = !cat.surprise;
  }

  function msSummary(f, arr) {
    return arr.length ? `<span class="ms-val">${esc(arr.map(t).join(LANG === 'zh' ? '、' : ', '))}</span>` : `<span class="ms-ph">${u('chooseMulti')}</span>`;
  }

  function renderFlavor() {
    const fl = CATEGORIES[state.cat].flavors;
    const cur = currentFlavor();
    $('#flavorSeg').innerHTML = fl ? fl.map((x) =>
      `<button type="button" role="radio" data-flavor="${x.id}" aria-checked="${x.id === cur}">${esc(t(x.label))}</button>`).join('') : '';
  }

  function renderTools() {
    $('#tools').innerHTML = CATEGORIES[state.cat].tools.map((id) => {
      const name = esc(t(TOOLS[id].name));
      const tool = TOOLS[id];
      return `<button type="button" class="tool" data-tool="${id}" title="${tool.url ? u('toolAuto') : u('toolPaste', { t: name })}">
        <strong>${name}</strong>${tool.url ? `<span class="badge">${u('autofill')}</span>` : `<span class="paste">${u('paste')}</span>`}</button>`;
    }).join('');
  }

  function renderOutput() {
    const textOut = promptText();
    if (output.value !== textOut) output.value = textOut;
    $('#charCount').textContent = u('chars', { n: textOut.length.toLocaleString() });
    $('#regenBtn').hidden = state.manual == null;
  }

  function renderStatic() {
    document.documentElement.lang = LANG === 'zh' ? 'zh-CN' : 'en';
    document.querySelectorAll('[data-i18n]').forEach((el) => { el.textContent = u(el.dataset.i18n); });
    document.querySelectorAll('[data-i18n-html]').forEach((el) => { el.innerHTML = u(el.dataset.i18nHtml); });
    document.querySelectorAll('[data-i18n-title]').forEach((el) => { el.title = u(el.dataset.i18nTitle); el.setAttribute('aria-label', el.title); });
  }

  function renderAll() {
    renderStatic(); renderTabs(); renderForm(); renderFlavor(); renderTools(); renderOutput(); renderHistory();
  }

  function persist() {
    store.set('prompter.values', state.values);
    store.set('prompter.cat', state.cat);
    store.set('prompter.flavor', state.flavor);
  }
  function changed() { state.manual = null; renderOutput(); persist(); }

  // ---------- clipboard & toast ----------
  let toastTimer;
  function toast(msg) {
    const el = $('#toast');
    el.textContent = msg;
    el.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove('show'), 2600);
  }

  function copyText(str) {
    const fallback = () => {
      const ta = document.createElement('textarea');
      ta.value = str; ta.setAttribute('readonly', ''); ta.style.position = 'fixed'; ta.style.opacity = '0';
      document.body.appendChild(ta); ta.select();
      let ok = false;
      try { ok = document.execCommand('copy'); } catch (e) { ok = false; }
      ta.remove();
      return ok;
    };
    if (navigator.clipboard && window.isSecureContext) {
      return navigator.clipboard.writeText(str).then(() => true, () => fallback());
    }
    return Promise.resolve(fallback());
  }

  // ---------- history ----------
  function addHistory(prompt) {
    const h = store.get('prompter.history', []).filter((x) => x.p !== prompt);
    h.unshift({ c: state.cat, p: prompt, v: state.values[state.cat], t: Date.now() });
    store.set('prompter.history', h.slice(0, 25));
    renderHistory();
  }
  function renderHistory() {
    const h = store.get('prompter.history', []);
    $('#historyCount').textContent = h.length ? `(${h.length})` : '';
    $('#historyList').innerHTML = h.length ? h.map((x, i) =>
      `<li><button type="button" data-h="${i}"><span class="h-meta">${esc(t((CATEGORIES[x.c] || {}).label || ''))} · ${new Date(x.t).toLocaleString(LANG === 'zh' ? 'zh-CN' : undefined)}</span><span class="h-text">${esc(x.p)}</span></button></li>`).join('')
      : `<li class="hint">${u('historyEmpty')}</li>`;
    $('#clearHistory').hidden = !h.length;
  }

  // ---------- events ----------
  $('#tabs').addEventListener('click', (e) => {
    const b = e.target.closest('[data-cat]');
    if (!b || b.dataset.cat === state.cat) return;
    state.cat = b.dataset.cat; state.manual = null;
    persist(); renderAll();
  });

  // Multi-select dropdowns: open/close
  const closePanels = (except) => form.querySelectorAll('.ms').forEach((m) => {
    if (m === except) return;
    m.querySelector('.ms-panel').hidden = true;
    m.querySelector('.ms-btn').setAttribute('aria-expanded', 'false');
  });
  form.addEventListener('click', (e) => {
    const btn = e.target.closest('.ms-btn');
    if (!btn) return;
    const box = btn.parentElement;
    const panel = box.querySelector('.ms-panel');
    closePanels(box);
    panel.hidden = !panel.hidden;
    btn.setAttribute('aria-expanded', String(!panel.hidden));
  });
  document.addEventListener('click', (e) => { if (!e.target.closest('.ms')) closePanels(); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closePanels(); });

  form.addEventListener('input', (e) => {
    const el = e.target;
    const raw = state.values[state.cat];
    if (el.dataset.ms) {
      const id = el.dataset.ms;
      const f = CATEGORIES[state.cat].fields.find((x) => x.id === id);
      const box = el.closest('.ms');
      // Keep the options' original order.
      raw[id] = f.options.filter((o) => box.querySelector(`input[value="${CSS.escape(o)}"]`).checked);
      box.querySelector('.ms-btn').innerHTML = msSummary(f, raw[id]);
      changed();
      return;
    }
    if (!el.dataset.id) return;
    raw[el.dataset.id] = el.type === 'checkbox' ? el.checked : el.value;
    // Typing a custom value for a single-choice field clears the selected chip.
    const base = el.dataset.id.replace(/_c$/, '');
    const f = CATEGORIES[state.cat].fields.find((x) => x.id === base);
    if (el.dataset.id.endsWith('_c') && f && f.type === 'choice' && el.value.trim()) {
      raw[base] = '';
      const s = el.parentElement.querySelector('select');
      if (s) s.value = '';
    }
    // Choosing from a single-choice dropdown replaces a typed custom value.
    if (el.tagName === 'SELECT' && el.value && raw[el.dataset.id + '_c']) {
      raw[el.dataset.id + '_c'] = '';
      const ci = el.parentElement.querySelector('.custom-in');
      if (ci) ci.value = '';
    }
    changed();
  });

  $('#flavorSeg').addEventListener('click', (e) => {
    const b = e.target.closest('[data-flavor]');
    if (!b) return;
    state.flavor = b.dataset.flavor;
    renderFlavor(); changed();
  });

  output.addEventListener('input', () => {
    state.manual = output.value === generated() ? null : output.value;
    $('#regenBtn').hidden = state.manual == null;
    $('#charCount').textContent = u('chars', { n: output.value.length.toLocaleString() });
  });
  $('#regenBtn').addEventListener('click', () => { state.manual = null; renderOutput(); });

  function hasContent() {
    const v = resolved(state.cat);
    return Object.values(v).some((x) => x && x !== true);
  }

  $('#copyBtn').addEventListener('click', () => {
    const p = promptText();
    copyText(p).then((ok) => {
      toast(ok ? u('copied') : u('copyFail'));
      if (ok && hasContent()) addHistory(p);
    });
  });

  $('#shareBtn').addEventListener('click', () => {
    const data = { c: state.cat, v: state.values[state.cat], f: state.flavor, l: LANG };
    const enc = encodeURIComponent(btoa(unescape(encodeURIComponent(JSON.stringify(data)))));
    const url = location.href.split('#')[0] + '#s=' + enc;
    copyText(url).then((ok) => toast(ok ? u('linkCopied') : u('linkFail')));
  });

  $('#tools').addEventListener('click', (e) => {
    const b = e.target.closest('[data-tool]');
    if (!b) return;
    const t = TOOLS[b.dataset.tool];
    // Use the tool's preferred prompt style (e.g. --ar flags for Midjourney) unless the prompt was edited by hand.
    const fl = CATEGORIES[state.cat].flavors;
    const flavor = t.flavor && fl && fl.some((x) => x.id === t.flavor) && state.flavor === 'natural' ? t.flavor : currentFlavor();
    const p = state.manual != null ? state.manual : generated(flavor);
    if (!hasContent() && state.manual == null) { toast(u('fillFirst')); return; }
    // Open synchronously inside the click so popup blockers allow it.
    const url = t.url ? t.url(p) : t.open;
    window.open(url, '_blank', 'noopener');
    copyText(p).then((ok) => {
      addHistory(p);
      const name = { t: I18N.zh[t.name] && LANG === 'zh' ? I18N.zh[t.name] : t.name };
      toast(ok ? u(t.url ? 'sentTo' : 'pasteInto', name) : u(t.url ? 'opened' : 'openedFail', name));
    });
  });

  $('#historyList').addEventListener('click', (e) => {
    const b = e.target.closest('[data-h]');
    if (!b) return;
    const item = store.get('prompter.history', [])[+b.dataset.h];
    if (!item || !CATEGORIES[item.c]) return;
    state.cat = item.c;
    if (item.v) state.values[item.c] = JSON.parse(JSON.stringify(item.v));
    renderAll();
    state.manual = item.p === generated() ? null : item.p;
    renderOutput(); persist();
    toast(u('loaded'));
  });
  $('#clearHistory').addEventListener('click', () => { store.set('prompter.history', []); renderHistory(); });

  $('#resetBtn').addEventListener('click', () => {
    state.values[state.cat] = {}; state.manual = null;
    renderForm(); renderOutput(); persist();
  });
  $('#exampleBtn').addEventListener('click', () => {
    const c = CATEGORIES[state.cat];
    state.values[state.cat] = JSON.parse(JSON.stringify({ ...(c.example || {}), ...(LANG === 'zh' ? c.exampleZh || {} : {}) }));
    state.manual = null;
    renderForm(); renderOutput(); persist();
  });
  $('#surpriseBtn').addEventListener('click', () => {
    const cat = CATEGORIES[state.cat];
    if (!cat.surprise) return;
    const v = { subject: pick((LANG === 'zh' && cat.surprise.subjectZh) || cat.surprise.subject) };
    cat.fields.forEach((f) => {
      if (f.type === 'choice' && f.id !== 'action' && Math.random() < 0.85) v[f.id] = pick(f.options);
      if (f.type === 'multi' && f.id !== 'negative' && Math.random() < 0.7) {
        const n = 1 + Math.floor(Math.random() * 2);
        v[f.id] = [...f.options].sort(() => Math.random() - 0.5).slice(0, n);
      }
    });
    state.values[state.cat] = v; state.manual = null;
    renderForm(); renderOutput(); persist();
  });

  // ---------- theme ----------
  const applyTheme = (t) => { if (t) document.documentElement.dataset.theme = t; else delete document.documentElement.dataset.theme; };
  applyTheme(store.get('prompter.theme', null));
  $('#themeToggle').addEventListener('click', () => {
    const isDark = document.documentElement.dataset.theme
      ? document.documentElement.dataset.theme === 'dark'
      : window.matchMedia('(prefers-color-scheme: dark)').matches;
    const next = isDark ? 'light' : 'dark';
    applyTheme(next); store.set('prompter.theme', next);
  });

  $('#langToggle').addEventListener('click', () => {
    const from = LANG;
    LANG = LANG === 'zh' ? 'en' : 'zh';
    // Swap the example's free text to the new language if it hasn't been changed.
    Object.values(CATEGORIES).forEach((c, i) => {
      const vals = state.values[Object.keys(CATEGORIES)[i]];
      Object.keys(c.exampleZh || {}).forEach((k) => {
        const en = (c.example || {})[k], zh = c.exampleZh[k];
        if (from === 'en' && vals[k] === en && en) vals[k] = zh;
        else if (from === 'zh' && vals[k] === zh) vals[k] = en || '';
      });
    });
    persist();
    store.set('prompter.lang', LANG);
    state.manual = null;
    renderAll();
  });

  // Keyboard shortcut: Ctrl/⌘+Enter copies.
  document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') { e.preventDefault(); $('#copyBtn').click(); }
  });

  // Hide the mobile "View prompt" button once the prompt panel is on screen.
  if ('IntersectionObserver' in window) {
    new IntersectionObserver((es) => $('#fab').classList.toggle('hide', es[0].isIntersecting)).observe($('.output-panel'));
  }

  renderAll();
})();
