

import { GoogleGenAI, Chat, Type } from "@google/genai";

const root = document.getElementById('root');

if (typeof process === 'undefined' || typeof process.env === 'undefined') {
    const errorHTML = `
      <div class="min-h-screen flex flex-col items-center justify-center p-4">
        <div class="content-card max-w-lg w-full p-8 text-center rounded-2xl shadow-2xl text-white">
            <h1 class="text-3xl font-bold mb-4">Configuration Error</h1>
            <p class="text-slate-300">
                This application requires an environment where the API key can be securely provided.
            </p>
            <p class="text-slate-400 mt-4 text-sm">
                It appears <code>process.env.API_KEY</code> is not available, which is common when running directly in a browser. For deployment on services like GitHub Pages, a build step is needed to substitute the API key.
            </p>
        </div>
      </div>
    `;
    if(root) root.innerHTML = errorHTML;
    throw new Error("Execution environment does not provide process.env. The application cannot run without an API key.");
}

const API_KEY = process.env.API_KEY;
if (!API_KEY) {
    throw new Error("API_KEY environment variable not set");
}
const ai = new GoogleGenAI({ apiKey: API_KEY });

let openChat: Chat | null = null;
let aiTherapistChat: Chat | null = null;
let practiceScenarioChat: Chat | null = null;

// --- DATA ---

const themes = {
    'nebula': { name: 'Nebula', gradient: 'linear-gradient(-45deg, #0f172a, #1e1b4b, #4c1d95, #1e3a8a)' },
    'forest': { name: 'Serene Forest', gradient: 'linear-gradient(-45deg, #0F2027, #203A43, #2C5364, #1A2E2C)' },
    'sunset': { name: 'Sunset Glow', gradient: 'linear-gradient(-45deg, #ff7e5f, #feb47b, #ff758c, #ff7eb3)' },
    'ocean': { name: 'Deep Ocean', gradient: 'linear-gradient(-45deg, #000428, #004e92, #1cb5e0, #2575fc)' }
};

const avatars = {
    'user': {
        'cat': '🐱', 'dog': '🐶', 'fox': '🦊', 'bear': '🐻', 'panda': '🐼', 'robot': '🤖', 'star': '🌟', 'alien': '👽'
    },
    'ai': {
        'Bloom': '🌸', // AI Therapist
        'Sparky': '💡', // Open Chat
        'Practice': '🎭' // Practice Scenarios
    }
};
type UserAvatarID = keyof typeof avatars.user;

const practiceScenarios: { [key: string]: { description: string; levels: { [key: string]: { subtitle: string; systemInstruction: string; } } } } = {
    'Daily Talk': {
        description: 'Casual chats and everyday interactions.',
        levels: {
            'Level 1': {
                subtitle: 'You\'ve bumped into a friendly acquaintance.',
                systemInstruction: 'You are role-playing as a friendly acquaintance who just bumped into the user. Start the conversation with a simple greeting like \'Oh, hey! How\'s it going?\'. Keep your responses short, friendly, and ask simple questions.'
            },
            'Level 2': {
                subtitle: 'You\'re ordering a coffee from a cheerful barista.',
                systemInstruction: 'You are role-playing as a cheerful and talkative barista. Start by asking for the user\'s order, like \'Hi there! What can I get for you today?\'. Try to make friendly small talk while you prepare their imaginary drink.'
            },
            'Level 3': {
                subtitle: 'You\'re in an elevator with a quiet neighbor.',
                systemInstruction: 'You are role-playing as a neighbor in an elevator. You are a bit quiet but friendly. Start with a simple \'Morning\' or \'Hey\'. The user has to initiate and carry the conversation. Keep your initial responses brief.'
            }
        }
    },
    'Parties & Social Gatherings': {
        description: 'Navigating group conversations and events.',
        levels: {
            'Level 1': {
                subtitle: 'You\'re at a lively party, making conversation.',
                systemInstruction: 'You are role-playing as someone at a bustling party. Start a conversation with the user by commenting on the party, like \'Hey! This is a great party, right?\'. Keep the conversation light, fun, and focused on topics like hobbies, music, or travel.'
            },
            'Level 2': {
                subtitle: 'You\'re joining a small group already in conversation.',
                systemInstruction: 'You are role-playing as part of a small group at a social mixer. The user is approaching your group. Greet them warmly and include them in your conversation, for example: \'Hey, come join us! We were just talking about weekend plans.\'. Be welcoming.'
            },
            'Level 3': {
                subtitle: 'You\'re at a networking event trying to make an impression.',
                systemInstruction: 'You are role-playing as a professional at a networking event. The user is approaching you. Be polite and professional. Start with \'Hello there. Great event, isn\'t it? What brings you here?\'. Ask about their work and interests in the industry.'
            }
        }
    },
    'On a Date': {
        description: 'Making a connection, one-on-one.',
        levels: {
            'Level 1': {
                subtitle: 'You\'re on a first date. Be engaging!',
                systemInstruction: 'You are role-playing as a person on a first date. You are friendly, engaging, and genuinely interested. Start the conversation with a warm greeting like \'Hey, thanks for meeting me.\'. Ask open-ended questions about their life, hobbies, and passions.'
            },
            'Level 2': {
                subtitle: 'It\'s the second date. Time to go deeper.',
                systemInstruction: 'You are on a second date with the user. You already know the basics. Start with something like, \'It\'s so good to see you again!\' Then, ask more meaningful questions about their aspirations, values, or what they are passionate about. Share a bit about yourself too.'
            },
            'Level 3': {
                subtitle: 'Your date seems shy. You need to lead the chat.',
                systemInstruction: 'You are on a first date, but you are role-playing as someone who is a bit shy and reserved. You are still interested. Start with a simple \'Hi...\'. Let the user lead the conversation. Give friendly but short answers initially, warming up as the conversation progresses.'
            }
        }
    },
    'Workspace': {
        description: 'Professionalism and building rapport.',
        levels: {
            'Level 1': {
                subtitle: 'Casual chat with a coworker by the water cooler.',
                systemInstruction: 'You are a friendly coworker. You see the user at the water cooler. Start a light, casual conversation like, \'Hey, how\'s your week going? Any plans for the weekend?\'. Keep it SFW (safe for work) and positive.'
            },
            'Level 2': {
                subtitle: 'You\'re in a brainstorming session with a colleague.',
                systemInstruction: 'You are a collaborative colleague in a brainstorming session. Start with an open idea, like \'Alright, so we need to figure out the marketing for this new project. I was thinking we could start with social media. What are your thoughts?\'. Be open to the user\'s ideas and build on them.'
            },
            'Level 3': {
                subtitle: 'Respectfully disagreeing with your boss.',
                systemInstruction: 'You are a manager in a meeting. You have just proposed an idea. The user is your direct report and needs to disagree. Start by stating your idea: \'I think we should move the deadline up by two weeks to impress the client.\' When the user responds, react calmly and ask for their reasoning. Be open to discussion but firm in your initial position.'
            }
        }
    }
};

const goalEmojis: { [key: string]: string } = {
    'Daily Talk': '🗣️',
    'Parties & Social Gatherings': '🎉',
    'On a Date': '❤️',
    'Workspace': '💼'
};

const achievements = {
    'FIRST_CONVO': { name: 'Icebreaker', description: 'Complete your first practice conversation.', icon: '💬' },
    'FIVE_CONVOS': { name: 'Socializer', description: 'Complete 5 practice conversations.', icon: '🗣️' },
    'TEN_CONVOS': { name: 'Chatterbox', description: 'Complete 10 practice conversations.', icon: '🌟' },
    'ALL_CATEGORIES': { name: 'Master Communicator', description: 'Complete a scenario in every category.', icon: '🎓' },
    'LEVEL_3': { name: 'Courageous', description: 'Successfully complete a Level 3 scenario.', icon: '💪' },
    'FIRST_JOURNAL': { name: 'First Thoughts', description: 'Write and save your first journal entry.', icon: '✍️' },
    'CREATIVE_JOURNAL': { name: 'Creative Soul', description: 'Add a doodle or an image to a journal entry.', icon: '🎨' },
    'REFLECTIVE_MIND': { name: 'Deep Thinker', description: 'Analyze your feelings with Bloom in your journal.', icon: '🧠' },
    'VENTED': { name: 'Let It Go', description: 'Send away a worry in the Anxiety Relief Zone.', icon: '🕊️' },
    'BREATHED': { name: 'Zen Mode', description: 'Complete a full 1-minute breathing exercise.', icon: '🧘' }
};

type AchievementID = keyof typeof achievements;

type ConversationTurn = { role: 'user' | 'model'; text: string; };

// --- UTILITY & ACHIEVEMENT FUNCTIONS ---

let timerInterval: ReturnType<typeof setInterval> | null = null;

const applyTheme = (themeName: string) => {
    const body = document.body;
    Object.keys(themes).forEach(key => body.classList.remove(`theme-${key}`));
    body.classList.add(`theme-${themeName}`);
    localStorage.setItem('selectedTheme', themeName);
};

const loadTheme = () => {
    const savedTheme = localStorage.getItem('selectedTheme');
    if (savedTheme && themes[savedTheme]) {
        applyTheme(savedTheme);
    } else {
        applyTheme('nebula');
    }
};

const applyMood = (mood: 'default' | 'calm') => {
    const body = document.body;
    if (mood === 'calm') {
        body.classList.add('theme-calm', 'dim-mode');
    } else {
        body.classList.remove('theme-calm', 'dim-mode');
    }
    localStorage.setItem('selectedMood', mood);
};

const loadMood = () => {
    const savedMood = localStorage.getItem('selectedMood') as 'default' | 'calm' | null;
    applyMood(savedMood || 'default');
};


const getProgress = () => {
    const progressRaw = localStorage.getItem('bloomout_progress');
    const defaultProgress = {
        unlockedAchievements: [],
        conversationStats: { count: 0, completedCategories: [] },
        journalStats: { count: 0 }
    };
    return progressRaw ? JSON.parse(progressRaw) : defaultProgress;
};

const saveProgress = (progress: any) => {
    localStorage.setItem('bloomout_progress', JSON.stringify(progress));
};

const showAchievementPopup = (achievementID: AchievementID) => {
    const achievement = achievements[achievementID];
    if (!achievement) return;

    const popup = document.createElement('div');
    popup.className = 'achievement-popup';
    popup.innerHTML = `
        <div class="achievement-icon">${achievement.icon}</div>
        <div>
            <h3 class="font-bold">Achievement Unlocked!</h3>
            <p>${achievement.name}</p>
        </div>
    `;
    document.body.appendChild(popup);

    setTimeout(() => {
        popup.classList.add('visible');
    }, 100);

    setTimeout(() => {
        popup.classList.remove('visible');
        setTimeout(() => {
            document.body.removeChild(popup);
        }, 500);
    }, 4000);
};

const unlockAchievement = (achievementID: AchievementID) => {
    const progress = getProgress();
    if (!progress.unlockedAchievements.includes(achievementID)) {
        progress.unlockedAchievements.push(achievementID);
        saveProgress(progress);
        showAchievementPopup(achievementID);
    }
};


const transitionTo = (renderFunction: () => void) => {
    if (!root) return;
    if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
    }
    root.classList.add('animate-fade-out');
    setTimeout(() => {
        root.innerHTML = '';
        root.classList.remove('animate-fade-out');
        renderFunction();
    }, 300);
};

const addBackButtonListener = (handler: () => void) => {
    const backButton = document.getElementById('back-btn');
    backButton?.addEventListener('click', handler);
};


const startTimer = (duration: number, timerEl: HTMLElement, onComplete: () => void) => {
    let timer = duration;
    const updateTimer = () => {
        const minutes = Math.floor(timer / 60);
        let seconds = (timer % 60).toString().padStart(2, '0');
        timerEl.textContent = `${minutes}:${seconds}`;
        if (--timer < 0) {
            if(timerInterval) clearInterval(timerInterval);
            onComplete();
        }
    };
    updateTimer();
    timerInterval = setInterval(updateTimer, 1000);
};

const getPersonalizedSystemInstruction = (baseInstruction: string): string => {
    const userProfileRaw = localStorage.getItem('userProfile');
    if (!userProfileRaw) {
        return baseInstruction;
    }

    try {
        const profile = JSON.parse(userProfileRaw);
        let profileText = "Here is some information about the user you are talking to, please use it to make the conversation more personal and relevant:\n";
        let hasInfo = false;

        if (profile.username) { profileText += `- Their name is ${profile.username}.\n`; hasInfo = true; }
        if (profile.age) { profileText += `- They are ${profile.age} years old.\n`; hasInfo = true; }
        if (profile.gender && profile.gender !== 'prefer_not_to_say') { profileText += `- They identify as ${profile.gender}.\n`; hasInfo = true; }
        if (profile.status) { profileText += `- They are a ${profile.status}.\n`; hasInfo = true; }
        if (profile.hobby) { profileText += `- Their hobby is ${profile.hobby}.\n`; hasInfo = true; }
        if (profile.purpose) { profileText += `- They are using this app to '${profile.purpose}'.\n`; hasInfo = true; }

        if (hasInfo) {
            return `${baseInstruction}\n\n${profileText}`;
        }
    } catch (e) {
        console.error("Failed to parse user profile", e);
    }
    
    return baseInstruction;
};

const renderConfirmationDialog = (
    title: string, 
    message: string, 
    onConfirm: () => void, 
    confirmText = 'Confirm', 
    cancelText = 'Cancel'
) => {
    const dialogOverlay = document.createElement('div');
    dialogOverlay.className = 'fixed inset-0 bg-black bg-opacity-60 backdrop-blur-sm flex items-center justify-center z-[1000] animate-fade-in';
    
    const dialogContent = document.createElement('div');
    dialogContent.className = 'content-card max-w-sm w-full p-8 rounded-2xl shadow-2xl text-white text-center';
    dialogContent.setAttribute('role', 'alertdialog');
    dialogContent.setAttribute('aria-modal', 'true');
    dialogContent.setAttribute('aria-labelledby', 'dialog-title');
    dialogContent.setAttribute('aria-describedby', 'dialog-description');
    
    dialogContent.innerHTML = `
        <h2 id="dialog-title" class="text-2xl font-bold mb-4">${title}</h2>
        <p id="dialog-description" class="text-slate-300 mb-8">${message}</p>
        <div class="flex justify-center gap-4">
            <button id="dialog-cancel-btn" class="back-btn font-bold py-3 px-8 rounded-full shadow-lg">${cancelText}</button>
            <button id="dialog-confirm-btn" class="${confirmText.toLowerCase() === 'delete' ? 'delete-btn' : 'duration-btn'} font-bold text-lg py-3 px-8 rounded-full shadow-lg">${confirmText}</button>
        </div>
    `;
    
    dialogOverlay.appendChild(dialogContent);
    document.body.appendChild(dialogOverlay);

    const confirmBtn = document.getElementById('dialog-confirm-btn') as HTMLButtonElement;
    const cancelBtn = document.getElementById('dialog-cancel-btn') as HTMLButtonElement;
    
    const focusableElements = [confirmBtn, cancelBtn];
    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];
    
    firstElement.focus();

    const closeDialog = () => {
        window.removeEventListener('keydown', handleKeydown);
        dialogOverlay.classList.remove('animate-fade-in');
        dialogOverlay.classList.add('animate-fade-out');
        setTimeout(() => {
            if (document.body.contains(dialogOverlay)) {
                document.body.removeChild(dialogOverlay);
            }
        }, 300);
    };

    const handleKeydown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
            closeDialog();
        }
        if (e.key === 'Tab') {
            if (e.shiftKey) { // Shift + Tab
                if (document.activeElement === firstElement) {
                    e.preventDefault();
                    lastElement.focus();
                }
            } else { // Tab
                if (document.activeElement === lastElement) {
                    e.preventDefault();
                    firstElement.focus();
                }
            }
        }
    };
    
    window.addEventListener('keydown', handleKeydown);

    confirmBtn.addEventListener('click', () => {
        onConfirm();
        closeDialog();
    });

    cancelBtn.addEventListener('click', () => {
        closeDialog();
    });

    // Close on overlay click
    dialogOverlay.addEventListener('click', (e) => {
        if (e.target === dialogOverlay) {
            closeDialog();
        }
    });
};


// --- RENDER FUNCTIONS ---

const renderAnalysisScreen = (conversationHistory: ConversationTurn[], goal: string, level: string) => {
    if (!root) return;

    root.innerHTML = `
        <div class="min-h-screen flex flex-col items-center justify-center p-4 animate-fade-in">
            <div class="content-card max-w-2xl w-full p-8 sm:p-10 rounded-2xl shadow-2xl text-white text-center">
                <h1 class="text-3xl sm:text-4xl font-bold mb-6">🧠 Analyzing your conversation...</h1>
                <div class="loading-spinner"></div>
                <p class="text-slate-300 mt-4">Your feedback is being prepared!</p>
            </div>
        </div>
    `;

    const analyzeConversation = async () => {
        const analysisPrompt = `Based on the following conversation transcript, act as a supportive and friendly communication coach. Analyze the user's performance on a scale of 1 to 5 for the following criteria:
1. **Engagement:** How well did the user ask questions and show interest to keep the conversation flowing? 1 is poor, 5 is excellent.
2. **Reciprocity:** Did the user share a balanced amount about themselves, contributing to a two-way conversation? 1 is poor, 5 is excellent.
Finally, provide one single, kind, and actionable suggestion for what the user could improve next time. Keep it encouraging and brief. The user's messages are from the 'user' role.`;

        const formattedHistory = conversationHistory.map(turn => `${turn.role === 'user' ? 'User' : 'AI'}: ${turn.text}`).join('\n');

        const responseSchema = {
            type: Type.OBJECT,
            properties: {
                engagementScore: { type: Type.INTEGER, description: 'Score from 1 to 5 for engagement.' },
                reciprocityScore: { type: Type.INTEGER, description: 'Score from 1 to 5 for reciprocity.' },
                kindSuggestion: { type: Type.STRING, description: 'A single, kind, and actionable suggestion.' }
            },
            required: ['engagementScore', 'reciprocityScore', 'kindSuggestion']
        };

        try {
            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: `${analysisPrompt}\n\n--- CONVERSATION ---\n${formattedHistory}`,
                config: {
                    responseMimeType: 'application/json',
                    responseSchema: responseSchema,
                },
            });

            // --- Handle Achievements on Successful Analysis ---
            const progress = getProgress();
            const prevCount = progress.conversationStats.count;
            progress.conversationStats.count += 1;
            const newCategories = new Set(progress.conversationStats.completedCategories);
            newCategories.add(goal);
            progress.conversationStats.completedCategories = Array.from(newCategories);
            saveProgress(progress);
            
            if (prevCount === 0) unlockAchievement('FIRST_CONVO');
            if (progress.conversationStats.count === 5) unlockAchievement('FIVE_CONVOS');
            if (progress.conversationStats.count === 10) unlockAchievement('TEN_CONVOS');
            if (level === 'Level 3') unlockAchievement('LEVEL_3');
            if (progress.conversationStats.completedCategories.length === Object.keys(practiceScenarios).length) unlockAchievement('ALL_CATEGORIES');
            // --- End of Achievements ---

            return JSON.parse(response.text);
        } catch (error) {
            console.error("Analysis Error:", error);
            return null;
        }
    };

    analyzeConversation().then(analysis => {
        if (!root) return;
        if (analysis) {
            root.innerHTML = `
                <div class="min-h-screen flex flex-col items-center justify-center p-4 animate-fade-in">
                    <div class="content-card max-w-2xl w-full p-8 sm:p-10 rounded-2xl shadow-2xl text-white">
                        <h1 class="text-3xl sm:text-4xl font-bold text-center mb-8">📊 Conversation Report</h1>

                        <div class="mb-6">
                            <div class="flex justify-between items-center mb-1">
                                <h3 class="font-bold text-lg">🤝 Engagement</h3>
                                <span class="font-bold text-lg">${analysis.engagementScore} / 5</span>
                            </div>
                            <div class="progress-bar-container">
                                <div class="progress-bar-fill" style="width: ${analysis.engagementScore * 20}%;"></div>
                            </div>
                            <p class="text-sm text-slate-400 mt-1">How well you kept the conversation going.</p>
                        </div>

                        <div class="mb-8">
                            <div class="flex justify-between items-center mb-1">
                                <h3 class="font-bold text-lg">⚖️ Reciprocity</h3>
                                <span class="font-bold text-lg">${analysis.reciprocityScore} / 5</span>
                            </div>
                            <div class="progress-bar-container">
                                <div class="progress-bar-fill" style="width: ${analysis.reciprocityScore * 20}%;"></div>
                            </div>
                            <p class="text-sm text-slate-400 mt-1">How well you balanced sharing and listening.</p>
                        </div>

                        <div class="suggestion-box">
                            <h3 class="font-bold text-lg mb-2">💡 A Kind Suggestion</h3>
                            <p class="text-slate-200">${analysis.kindSuggestion}</p>
                        </div>
                        
                        <div class="flex justify-center gap-4 mt-8">
                             <button id="try-again-btn" class="back-btn font-bold py-3 px-8 rounded-full shadow-lg">Try Again</button>
                             <button id="done-btn" class="duration-btn font-bold text-lg py-3 px-8 rounded-full shadow-lg">Done</button>
                        </div>
                    </div>
                </div>
            `;
            document.getElementById('try-again-btn')?.addEventListener('click', () => {
                transitionTo(() => renderPracticeChatScreen(goal, level, practiceScenarios[goal].levels[level].subtitle));
            });
            document.getElementById('done-btn')?.addEventListener('click', () => {
                transitionTo(() => renderPracticeLevels(goal));
            });
        } else {
            root.innerHTML = `
                <div class="min-h-screen flex flex-col items-center justify-center p-4 animate-fade-in">
                    <div class="content-card max-w-2xl w-full p-8 sm:p-10 rounded-2xl shadow-2xl text-white text-center">
                        <h1 class="text-3xl sm:text-4xl font-bold mb-6">😕 Oops!</h1>
                        <p class="text-slate-300 mt-4">Something went wrong while analyzing your conversation. Please try again.</p>
                        <div class="flex justify-center gap-4 mt-8">
                             <button id="try-again-btn" class="back-btn font-bold py-3 px-8 rounded-full shadow-lg">Try Again</button>
                             <button id="done-btn" class="duration-btn font-bold text-lg py-3 px-8 rounded-full shadow-lg">Go Back</button>
                        </div>
                    </div>
                </div>
            `;
            document.getElementById('try-again-btn')?.addEventListener('click', () => {
                transitionTo(() => renderPracticeChatScreen(goal, level, practiceScenarios[goal].levels[level].subtitle));
            });
            document.getElementById('done-btn')?.addEventListener('click', () => {
                transitionTo(() => renderPracticeLevels(goal));
            });
        }
    });
};

interface ChatInterfaceConfig {
    title: string;
    subtitle: string;
    onBack: () => void;
    onMessageSent: (message: string) => Promise<void>;
    conversationHistory: ConversationTurn[];
    aiAvatar: string;
    userAvatar: string;
    isPractice?: boolean;
}

const renderChatInterface = ({ title, subtitle, onBack, onMessageSent, conversationHistory, aiAvatar, userAvatar, isPractice }: ChatInterfaceConfig) => {
    if (!root) return;

    root.innerHTML = `
        <div class="min-h-screen flex flex-col items-center justify-center p-4 animate-fade-in">
            <div class="content-card max-w-2xl w-full h-[90vh] flex flex-col p-6 sm:p-8 rounded-2xl shadow-2xl text-white">
                <header class="flex items-center justify-between pb-4 border-b border-slate-700">
                    <button id="back-btn" class="back-btn font-bold py-2 px-4 rounded-full shadow-lg">← Back</button>
                    <div class="text-center">
                        <h1 class="text-2xl sm:text-3xl font-bold">${title}</h1>
                        <p class="text-sm text-slate-400">${subtitle}</p>
                    </div>
                    <div id="header-extra-content" class="w-20 text-right"></div>
                </header>
                <div id="chat-container" class="flex-1 overflow-y-auto my-4 pr-2 chat-container">
                    <!-- Messages will be injected here -->
                </div>
                <div id="typing-indicator-container" class="h-14"></div>
                <footer class="flex items-center gap-4">
                    <textarea id="chat-input" class="flex-1 bg-slate-800 border border-slate-700 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none" rows="1" placeholder="Type your message..."></textarea>
                    <button id="send-btn" class="duration-btn font-bold text-lg py-3 px-6 rounded-full shadow-lg">Send</button>
                </footer>
            </div>
        </div>
    `;

    const chatContainer = document.getElementById('chat-container') as HTMLDivElement;
    const chatInput = document.getElementById('chat-input') as HTMLTextAreaElement;
    const sendBtn = document.getElementById('send-btn') as HTMLButtonElement;
    const typingIndicatorContainer = document.getElementById('typing-indicator-container') as HTMLDivElement;

    addBackButtonListener(onBack);

    const appendMessage = (turn: ConversationTurn) => {
        const messageRow = document.createElement('div');
        messageRow.className = `message-row ${turn.role === 'user' ? 'user-row' : 'ai-row'}`;
        
        const avatarDiv = document.createElement('div');
        avatarDiv.className = 'avatar-container';
        avatarDiv.textContent = turn.role === 'user' ? userAvatar : aiAvatar;

        const messageBubble = document.createElement('div');
        messageBubble.className = 'message-bubble';
        
        const textP = document.createElement('p');
        textP.textContent = turn.text;
        
        const timeSpan = document.createElement('span');
        timeSpan.className = 'timestamp';
        timeSpan.textContent = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

        messageBubble.appendChild(textP);
        messageBubble.appendChild(timeSpan);
        
        messageRow.appendChild(avatarDiv);
        messageRow.appendChild(messageBubble);

        messageBubble.addEventListener('click', () => {
            navigator.clipboard.writeText(turn.text);
            messageBubble.classList.add('copied');
            setTimeout(() => messageBubble.classList.remove('copied'), 1500);
        });
        
        chatContainer.appendChild(messageRow);
        chatContainer.scrollTop = chatContainer.scrollHeight;
    };

    const showTypingIndicator = (show: boolean) => {
        if (show) {
            typingIndicatorContainer.innerHTML = `
                <div class="message-row ai-row">
                    <div class="avatar-container">${aiAvatar}</div>
                    <div class="message-bubble">
                         <div class="typing-indicator"><span></span><span></span><span></span></div>
                    </div>
                </div>
            `;
        } else {
            typingIndicatorContainer.innerHTML = '';
        }
    };
    
    conversationHistory.forEach(appendMessage);
    
    const handleSend = async () => {
        const message = chatInput.value.trim();
        if (!message) return;

        const userTurn: ConversationTurn = { role: 'user', text: message };
        conversationHistory.push(userTurn);
        appendMessage(userTurn);
        chatInput.value = '';
        chatInput.style.height = 'auto';
        sendBtn.disabled = true;
        chatInput.disabled = true;
        showTypingIndicator(true);

        try {
            await onMessageSent(message);
            // The onMessageSent function will have pushed the AI response to history
            const aiTurn = conversationHistory[conversationHistory.length - 1];
            if(aiTurn.role === 'model') {
                 appendMessage(aiTurn);
            }
        } catch (error) {
            console.error("Error sending message:", error);
            const errorTurn: ConversationTurn = { role: 'model', text: "Sorry, I encountered an error. Please try again." };
            appendMessage(errorTurn);
        } finally {
            showTypingIndicator(false);
            sendBtn.disabled = false;
            chatInput.disabled = false;
            chatInput.focus();
        }
    };

    sendBtn.addEventListener('click', handleSend);
    chatInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    });

    chatInput.addEventListener('input', () => {
        chatInput.style.height = 'auto';
        chatInput.style.height = `${chatInput.scrollHeight}px`;
    });

    if (conversationHistory.length === 0 && (isPractice || title === 'AI Therapist')) {
         showTypingIndicator(true);
         onMessageSent("Start the conversation.").then(() => {
             const aiTurn = conversationHistory[conversationHistory.length - 1];
             if(aiTurn.role === 'model') {
                  appendMessage(aiTurn);
             }
             showTypingIndicator(false);
         });
    }

};

const renderPracticeChatScreen = (goal: string, level: string, subtitle: string) => {
    const systemInstruction = getPersonalizedSystemInstruction(practiceScenarios[goal].levels[level].systemInstruction);
    practiceScenarioChat = ai.chats.create({ model: 'gemini-2.5-flash', config: { systemInstruction } });
    
    const conversationHistory: ConversationTurn[] = [];

    const handleSendMessage = async (message: string) => {
        const response = await practiceScenarioChat!.sendMessage({ message });
        const aiTurn: ConversationTurn = { role: 'model', text: response.text };
        conversationHistory.push(aiTurn);
    };

    const userAvatar = localStorage.getItem('userAvatar') as UserAvatarID || 'star';

    renderChatInterface({
        title: goal,
        subtitle: subtitle,
        onBack: () => transitionTo(() => renderPracticeLevels(goal)),
        onMessageSent: handleSendMessage,
        conversationHistory: conversationHistory,
        aiAvatar: avatars.ai.Practice,
        userAvatar: avatars.user[userAvatar],
        isPractice: true
    });

    const headerExtraContent = document.getElementById('header-extra-content');
    if(headerExtraContent) {
        headerExtraContent.innerHTML = `<button id="end-session-btn" class="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded-full shadow-lg transition-all">End</button>`;
        document.getElementById('end-session-btn')?.addEventListener('click', () => {
            if(conversationHistory.length > 1) { // Ensure there is at least one user message
                transitionTo(() => renderAnalysisScreen(conversationHistory, goal, level));
            } else {
                transitionTo(() => renderPracticeLevels(goal));
            }
        });
    }
};


const renderPracticeLevels = (goal: string) => {
    const scenario = practiceScenarios[goal];
    if (!root) return;
    root.innerHTML = `
        <div class="min-h-screen flex flex-col items-center justify-center p-4 animate-fade-in">
            <div class="content-card max-w-2xl w-full p-8 sm:p-10 rounded-2xl shadow-2xl text-white">
                <header class="flex items-center justify-between pb-4 mb-8 border-b border-slate-700">
                     <button id="back-btn" class="back-btn font-bold py-2 px-4 rounded-full shadow-lg">← Back</button>
                     <div class="text-center">
                        <h1 class="text-3xl sm:text-4xl font-bold">${goalEmojis[goal]} ${goal}</h1>
                        <p class="text-slate-400 mt-2">${scenario.description}</p>
                    </div>
                    <div class="w-20"></div>
                </header>
                <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
                    ${Object.entries(scenario.levels).map(([level, details]) => `
                        <div class="feature-card p-6 rounded-xl text-center" data-level="${level}">
                            <h2 class="text-2xl font-bold mb-2">${level}</h2>
                            <p class="text-slate-300">${details.subtitle}</p>
                        </div>
                    `).join('')}
                </div>
            </div>
        </div>
    `;

    addBackButtonListener(() => transitionTo(renderPracticeScenarios));

    document.querySelectorAll('.feature-card').forEach(card => {
        card.addEventListener('click', () => {
            const level = card.getAttribute('data-level');
            if (level) {
                transitionTo(() => renderPracticeChatScreen(goal, level, scenario.levels[level].subtitle));
            }
        });
    });
};


const renderPracticeScenarios = () => {
    if (!root) return;
    root.innerHTML = `
        <div class="min-h-screen flex flex-col items-center justify-center p-4 animate-fade-in">
            <div class="content-card max-w-4xl w-full p-8 sm:p-10 rounded-2xl shadow-2xl text-white">
                <header class="flex items-center justify-between pb-4 mb-8 border-b border-slate-700">
                    <button id="back-btn" class="back-btn font-bold py-2 px-4 rounded-full shadow-lg">← Back</button>
                    <h1 class="text-3xl sm:text-4xl font-bold">🎭 Practice Scenarios</h1>
                    <div class="w-20"></div>
                </header>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                    ${Object.entries(practiceScenarios).map(([goal, details]) => `
                        <div class="feature-card p-6 rounded-xl flex items-center gap-6" data-goal="${goal}">
                            <div class="text-5xl">${goalEmojis[goal]}</div>
                            <div>
                                <h2 class="text-2xl font-bold">${goal}</h2>
                                <p class="text-slate-300">${details.description}</p>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        </div>
    `;

    addBackButtonListener(() => transitionTo(renderDashboard));

    document.querySelectorAll('.feature-card').forEach(card => {
        card.addEventListener('click', () => {
            const goal = card.getAttribute('data-goal');
            if (goal) {
                transitionTo(() => renderPracticeLevels(goal));
            }
        });
    });
};

const renderJournalZone = () => {
    // This is a placeholder for the full Journal Zone functionality
    if (!root) return;

    type JournalEntry = {
        id: string;
        date: string;
        title: string;
        content: string;
        pageStyle: 'lined' | 'dotted' | 'blank';
        doodleData?: string;
        imageData?: string;
    };

    const getJournalEntries = (): JournalEntry[] => {
        const entriesRaw = localStorage.getItem('journalEntries');
        return entriesRaw ? JSON.parse(entriesRaw) : [];
    };

    const saveJournalEntries = (entries: JournalEntry[]) => {
        localStorage.setItem('journalEntries', JSON.stringify(entries));
    };

    const entries = getJournalEntries();
    let selectedEntryId: string | null = entries.length > 0 ? entries[0].id : null;

    const renderJournalUI = () => {
        const selectedEntry = entries.find(e => e.id === selectedEntryId);

        root.innerHTML = `
            <div class="min-h-screen flex flex-col items-center justify-center p-4 animate-fade-in">
                <div class="content-card max-w-6xl w-full p-6 sm:p-8 rounded-2xl shadow-2xl text-white h-[90vh] flex gap-8">
                    <!-- Left Panel: Past Entries -->
                    <div class="w-1/3 flex flex-col">
                        <header class="flex items-center justify-between pb-4 mb-4 border-b border-slate-700">
                            <button id="back-btn" class="back-btn font-bold py-2 px-4 rounded-full shadow-lg">← Back</button>
                            <h1 class="text-2xl font-bold">My Journal</h1>
                            <div class="w-20"></div>
                        </header>
                        <div id="past-entries-list" class="flex-1 overflow-y-auto pr-2 space-y-2 chat-container">
                            ${entries.map(entry => `
                                <div class="past-entry-item p-4 rounded-lg cursor-pointer ${entry.id === selectedEntryId ? 'selected' : ''}" data-id="${entry.id}">
                                    <h3 class="font-bold text-lg">${entry.title || 'Untitled Entry'}</h3>
                                    <p class="text-sm text-slate-400">${new Date(entry.date).toLocaleDateString()}</p>
                                    <p class="text-sm text-slate-300 truncate mt-1">${entry.content.substring(0, 50) || 'No content...'}</p>
                                </div>
                            `).join('')}
                        </div>
                         <button id="new-entry-btn" class="duration-btn font-bold text-lg py-3 px-8 rounded-full shadow-lg mt-4 w-full">＋ New Entry</button>
                    </div>

                    <!-- Right Panel: Editor -->
                    <div class="w-2/3 flex flex-col">
                        <div id="journal-toolbar" class="flex items-center justify-between pb-4 mb-4 border-b border-slate-700">
                             <div class="flex items-center gap-2">
                                <button id="save-entry-btn" class="toolbar-btn">💾 Save</button>
                                <button id="delete-entry-btn" class="toolbar-btn !bg-red-800/50 hover:!bg-red-700/80" style="display: none;">🗑️ Delete</button>
                                <button id="analyze-btn" class="toolbar-btn">🌸 Analyze with Bloom</button>
                             </div>
                             <div class="flex items-center gap-4">
                                <input type="color" id="doodle-color" title="Doodle color" value="#FFFFFF">
                                <button id="doodle-btn" class="toolbar-btn">✏️ Doodle</button>
                                <button class="toolbar-btn" onclick="document.getElementById('image-upload').click()">🖼️ Add Image</button>
                                <input type="file" id="image-upload" accept="image/*" class="hidden">
                                <select id="page-style-selector" class="bg-slate-800 border border-slate-700 rounded-md p-2 text-sm">
                                    <option value="lined">Lined</option>
                                    <option value="dotted">Dotted</option>
                                    <option value="blank">Blank</option>
                                </select>
                            </div>
                        </div>
                        <div class="flex-1 relative" id="journal-editor-wrapper">
                            <input type="text" id="journal-title-input" class="w-full bg-transparent text-3xl font-bold p-2 mb-2 focus:outline-none" placeholder="My Awesome Entry Title" value="${selectedEntry?.title || ''}">
                            <div id="journal-editor-container" class="relative w-full h-[calc(100%-50px)] rounded-lg overflow-hidden">
                                <div class="journal-page-bg page-lined"></div>
                                <img class="journal-image-display" style="display: none;">
                                <canvas class="journal-doodle-canvas"></canvas>
                                <textarea id="journal-editor" class="journal-editor-textarea p-4 text-lg" placeholder="Start writing...">${selectedEntry?.content || ''}</textarea>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        setupJournalListeners();
    };

    const setupJournalListeners = () => {
        addBackButtonListener(() => transitionTo(renderDashboard));

        let selectedEntry = entries.find(e => e.id === selectedEntryId);
        const titleInput = document.getElementById('journal-title-input') as HTMLInputElement;
        const editor = document.getElementById('journal-editor') as HTMLTextAreaElement;
        const pageStyleSelector = document.getElementById('page-style-selector') as HTMLSelectElement;
        const editorContainer = document.getElementById('journal-editor-container') as HTMLDivElement;
        const pageBg = editorContainer.querySelector('.journal-page-bg') as HTMLDivElement;
        
        // Canvas/Doodle state
        const editorWrapper = document.getElementById('journal-editor-wrapper') as HTMLDivElement;
        const doodleCanvas = editorContainer.querySelector('.journal-doodle-canvas') as HTMLCanvasElement;
        const ctx = doodleCanvas.getContext('2d');
        let isDoodling = false;
        let isDoodleModeActive = false;
        
        // Image state
        const imageUpload = document.getElementById('image-upload') as HTMLInputElement;
        const imageDisplay = editorContainer.querySelector('.journal-image-display') as HTMLImageElement;

        const updatePageStyle = (style: 'lined' | 'dotted' | 'blank') => {
            pageBg.classList.remove('page-lined', 'page-dotted');
            if (style === 'lined') pageBg.classList.add('page-lined');
            else if (style === 'dotted') pageBg.classList.add('page-dotted');
        };

        const loadEntry = () => {
            selectedEntry = entries.find(e => e.id === selectedEntryId);
            titleInput.value = selectedEntry?.title || '';
            editor.value = selectedEntry?.content || '';
            pageStyleSelector.value = selectedEntry?.pageStyle || 'lined';
            updatePageStyle(selectedEntry?.pageStyle || 'lined');

            // Reset and load doodle
            if (ctx) {
                ctx.clearRect(0, 0, doodleCanvas.width, doodleCanvas.height);
                if (selectedEntry?.doodleData) {
                    const img = new Image();
                    img.onload = () => ctx.drawImage(img, 0, 0);
                    img.src = selectedEntry.doodleData;
                }
            }
             
            // Reset and load image
            if (selectedEntry?.imageData) {
                imageDisplay.src = selectedEntry.imageData;
                imageDisplay.style.display = 'block';
            } else {
                imageDisplay.src = '';
                imageDisplay.style.display = 'none';
            }
        };
        
        document.querySelectorAll<HTMLDivElement>('.past-entry-item').forEach(item => {
            item.addEventListener('click', () => {
                const newId = item.dataset.id;
                if (newId !== selectedEntryId) {
                    selectedEntryId = newId ?? null;
                    document.querySelector('.past-entry-item.selected')?.classList.remove('selected');
                    item.classList.add('selected');
                    loadEntry();

                    // Show delete button for existing entries
                     const deleteBtn = document.getElementById('delete-entry-btn');
                     if (deleteBtn) deleteBtn.style.display = 'block';
                }
            });
        });

        document.getElementById('new-entry-btn')?.addEventListener('click', () => {
            selectedEntryId = null; // Deselect any entry
            titleInput.value = '';
            editor.value = '';
            pageStyleSelector.value = 'lined';
            updatePageStyle('lined');
            if (ctx) ctx.clearRect(0, 0, doodleCanvas.width, doodleCanvas.height);
            imageDisplay.src = '';
            imageDisplay.style.display = 'none';

            document.querySelector('.past-entry-item.selected')?.classList.remove('selected');
            document.getElementById('delete-entry-btn')!.style.display = 'none';
            titleInput.focus();
        });

        document.getElementById('save-entry-btn')?.addEventListener('click', () => {
            const entryContent = editor.value.trim();
            const entryTitle = titleInput.value.trim();
            
            if (!entryContent && !entryTitle) {
                // Could show a small notification here
                return;
            }

            const wasNewEntry = !selectedEntryId;

            if (selectedEntryId) { // Update existing entry
                const entry = entries.find(e => e.id === selectedEntryId);
                if (entry) {
                    entry.title = entryTitle;
                    entry.content = entryContent;
                    entry.date = new Date().toISOString();
                    entry.pageStyle = pageStyleSelector.value as 'lined' | 'dotted' | 'blank';
                    entry.doodleData = doodleCanvas.toDataURL();
                    entry.imageData = imageDisplay.src.startsWith('data:') ? imageDisplay.src : undefined;
                }
            } else { // Create new entry
                const newEntry: JournalEntry = {
                    id: `journal_${Date.now()}`,
                    date: new Date().toISOString(),
                    title: entryTitle,
                    content: entryContent,
                    pageStyle: pageStyleSelector.value as 'lined' | 'dotted' | 'blank',
                    doodleData: doodleCanvas.toDataURL(),
                    imageData: imageDisplay.src.startsWith('data:') ? imageDisplay.src : undefined,
                };
                entries.unshift(newEntry);
                selectedEntryId = newEntry.id;
            }

            saveJournalEntries(entries);

            // Achievements
            const progress = getProgress();
            if(progress.journalStats.count === 0) unlockAchievement('FIRST_JOURNAL');
            progress.journalStats.count = entries.length;
            saveProgress(progress);
            if (doodleCanvas.toDataURL() !== new HTMLCanvasElement().toDataURL() || (imageDisplay.src && imageDisplay.src.startsWith('data:'))) {
                 unlockAchievement('CREATIVE_JOURNAL');
            }
            
            // Re-render to update the list
            renderJournalUI();
        });

        const deleteBtn = document.getElementById('delete-entry-btn');
        if (deleteBtn) {
            deleteBtn.style.display = selectedEntryId ? 'block' : 'none';
            deleteBtn.onclick = () => { // Use onclick to easily reassign
                if (!selectedEntryId) return;
                 renderConfirmationDialog(
                    'Delete Entry',
                    'Are you sure you want to permanently delete this journal entry? This action cannot be undone.',
                    () => {
                        const indexToDelete = entries.findIndex(e => e.id === selectedEntryId);
                        if (indexToDelete > -1) {
                            entries.splice(indexToDelete, 1);
                            saveJournalEntries(entries);
                            // Re-render the journal zone to reflect the deletion
                            transitionTo(renderJournalZone);
                        }
                    },
                    'Delete',
                    'Cancel'
                );
            };
        }

        pageStyleSelector.addEventListener('change', (e) => {
            updatePageStyle((e.target as HTMLSelectElement).value as 'lined' | 'dotted' | 'blank');
        });
        
        // --- Doodle Logic ---
        const doodleBtn = document.getElementById('doodle-btn');
        const doodleColorPicker = document.getElementById('doodle-color') as HTMLInputElement;

        const resizeCanvas = () => {
            doodleCanvas.width = editorContainer.clientWidth;
            doodleCanvas.height = editorContainer.clientHeight;
            if (selectedEntry?.doodleData) {
                const img = new Image();
                img.onload = () => ctx?.drawImage(img, 0, 0);
                img.src = selectedEntry.doodleData;
            }
        };

        doodleBtn?.addEventListener('click', () => {
            isDoodleModeActive = !isDoodleModeActive;
            doodleBtn.classList.toggle('active');
            editorWrapper.classList.toggle('doodle-active');
            doodleCanvas.classList.toggle('active');
        });
        
        const startDoodle = (e: MouseEvent | TouchEvent) => {
            if (!isDoodleModeActive || !ctx) return;
            isDoodling = true;
            ctx.beginPath();
            const pos = getEventPosition(e);
            ctx.moveTo(pos.x, pos.y);
        };

        const drawDoodle = (e: MouseEvent | TouchEvent) => {
            if (!isDoodling || !isDoodleModeActive || !ctx) return;
            e.preventDefault();
            const pos = getEventPosition(e);
            ctx.lineTo(pos.x, pos.y);
            ctx.strokeStyle = doodleColorPicker.value;
            ctx.lineWidth = 3;
            ctx.lineCap = 'round';
            ctx.stroke();
        };

        const stopDoodle = () => {
            if (!isDoodling || !ctx) return;
            ctx.closePath();
            isDoodling = false;
        };

        const getEventPosition = (e: MouseEvent | TouchEvent) => {
            const rect = doodleCanvas.getBoundingClientRect();
             if (e instanceof MouseEvent) {
                return { x: e.clientX - rect.left, y: e.clientY - rect.top };
            } else { // TouchEvent
                return { x: e.touches[0].clientX - rect.left, y: e.touches[0].clientY - rect.top };
            }
        };
        
        doodleCanvas.addEventListener('mousedown', startDoodle);
        doodleCanvas.addEventListener('mousemove', drawDoodle);
        doodleCanvas.addEventListener('mouseup', stopDoodle);
        doodleCanvas.addEventListener('mouseout', stopDoodle);
        doodleCanvas.addEventListener('touchstart', startDoodle);
        doodleCanvas.addEventListener('touchmove', drawDoodle);
        doodleCanvas.addEventListener('touchend', stopDoodle);
        
        // --- Image Logic ---
        imageUpload.addEventListener('change', (e) => {
            const file = (e.target as HTMLInputElement).files?.[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (event) => {
                    imageDisplay.src = event.target?.result as string;
                    imageDisplay.style.display = 'block';
                };
                reader.readAsDataURL(file);
            }
        });
        
        window.addEventListener('resize', resizeCanvas);
        resizeCanvas();
        if (selectedEntryId) {
             loadEntry();
        }
    };
    
    renderJournalUI();
};


const renderAnxietyReliefZone = () => {
    if (!root) return;
    let breathPhase = 'ready'; // ready -> in -> hold -> out
    let breathTimeout: ReturnType<typeof setTimeout> | null = null;
    let animationFrameId: number;

    root.innerHTML = `
        <div class="min-h-screen flex flex-col items-center justify-center p-4 animate-fade-in">
            <div class="content-card max-w-4xl w-full p-8 sm:p-10 rounded-2xl shadow-2xl text-white">
                 <header class="flex items-center justify-between pb-4 mb-8 border-b border-slate-700">
                    <button id="back-btn" class="back-btn font-bold py-2 px-4 rounded-full shadow-lg">← Back</button>
                    <h1 class="text-3xl sm:text-4xl font-bold">🍃 Anxiety Relief Zone</h1>
                    <div class="w-20"></div>
                </header>

                <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <!-- Left: Breathing Exercise -->
                    <div class="text-center p-6 feature-card rounded-xl">
                        <h2 class="text-2xl font-bold mb-4">Box Breathing</h2>
                        <div id="breathing-container" class="relative w-48 h-48 sm:w-64 sm:h-64 mx-auto my-4 flex items-center justify-center">
                             <div class="breathing-circle"></div>
                             <p id="breath-instruction" class="text-xl sm:text-2xl font-bold z-10">Tap to Start</p>
                        </div>
                        <p id="breath-timer" class="text-lg font-semibold h-6"></p>
                    </div>

                    <!-- Right: Venting -->
                    <div class="p-6 feature-card rounded-xl flex flex-col">
                         <h2 class="text-2xl font-bold mb-4 text-center">Let It Go</h2>
                         <p class="text-slate-300 mb-4 text-center">Write down what's bothering you. When you're ready, send it away.</p>
                         <textarea id="vent-box" class="flex-1 bg-slate-800 border border-slate-700 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none text-white" placeholder="What's on your mind?"></textarea>
                         <button id="send-vent-btn" class="duration-btn font-bold text-lg py-3 px-8 rounded-full shadow-lg mt-4 w-full">Send Away 🕊️</button>
                    </div>
                </div>
                <div id="paper-plane"></div>
            </div>
        </div>
    `;

    const breathingContainer = document.getElementById('breathing-container');
    const breathInstruction = document.getElementById('breath-instruction');
    const breathingCircle = document.querySelector('.breathing-circle') as HTMLDivElement;
    const breathTimerEl = document.getElementById('breath-timer');
    let fullBreaths = 0;
    
    addBackButtonListener(() => {
        if(breathTimeout) clearTimeout(breathTimeout);
        if(timerInterval) clearInterval(timerInterval);
        if (animationFrameId) cancelAnimationFrame(animationFrameId);
        transitionTo(renderDashboard);
    });

    const startBreathingCycle = () => {
        if (!breathInstruction || !breathingCircle || !breathTimerEl) return;
        switch (breathPhase) {
            case 'ready':
                breathInstruction.textContent = 'Breathe In...';
                breathingCircle.classList.add('breathing-grow');
                breathPhase = 'in';
                if(timerInterval === null) startTimer(60, breathTimerEl, () => {
                     unlockAchievement('BREATHED');
                     if(timerInterval) clearInterval(timerInterval);
                     timerInterval = null;
                     breathTimerEl.textContent = 'Great job!';
                });
                breathTimeout = setTimeout(startBreathingCycle, 4000);
                break;
            case 'in':
                breathInstruction.textContent = 'Hold';
                breathPhase = 'hold';
                breathTimeout = setTimeout(startBreathingCycle, 4000);
                break;
            case 'hold':
                breathInstruction.textContent = 'Breathe Out...';
                breathingCircle.classList.remove('breathing-grow');
                breathPhase = 'out';
                breathTimeout = setTimeout(startBreathingCycle, 4000);
                break;
            case 'out':
                fullBreaths++;
                breathInstruction.textContent = `Breathe In... (${fullBreaths + 1})`;
                breathingCircle.classList.add('breathing-grow');
                breathPhase = 'in';
                breathTimeout = setTimeout(startBreathingCycle, 4000);
                break;
        }
    };
    
    breathingContainer?.addEventListener('click', () => {
        if (breathPhase === 'ready') {
            startBreathingCycle();
        }
    });

    const ventBox = document.getElementById('vent-box') as HTMLTextAreaElement;
    const sendVentBtn = document.getElementById('send-vent-btn') as HTMLButtonElement;
    const paperPlane = document.getElementById('paper-plane') as HTMLDivElement;

    sendVentBtn.addEventListener('click', () => {
        const text = ventBox.value;
        if (!text.trim()) return;

        const rect = ventBox.getBoundingClientRect();

        // Create a temporary element to animate
        const flyawayText = document.createElement('div');
        flyawayText.id = 'vent-text-flyaway';
        flyawayText.textContent = text;
        flyawayText.style.top = `${rect.top}px`;
        flyawayText.style.left = `${rect.left}px`;
        flyawayText.style.width = `${rect.width}px`;
        flyawayText.style.height = `${rect.height}px`;
        document.body.appendChild(flyawayText);

        ventBox.value = '';
        ventBox.disabled = true;
        sendVentBtn.disabled = true;

        setTimeout(() => {
            flyawayText.classList.add('animating');
        }, 10);
        
        setTimeout(() => {
            document.body.removeChild(flyawayText);
            paperPlane.classList.add('flying');
        }, 800);

        paperPlane.addEventListener('animationend', () => {
            paperPlane.classList.remove('flying');
            ventBox.disabled = false;
            sendVentBtn.disabled = false;
        }, { once: true });
        
        unlockAchievement('VENTED');
    });
};

const renderAchievementsScreen = () => {
    if(!root) return;
    const progress = getProgress();
    const unlocked: Set<AchievementID> = new Set(progress.unlockedAchievements);
    
    root.innerHTML = `
        <div class="min-h-screen flex flex-col items-center justify-center p-4 animate-fade-in">
             <div class="content-card max-w-4xl w-full p-8 sm:p-10 rounded-2xl shadow-2xl text-white">
                <header class="flex items-center justify-between pb-4 mb-8 border-b border-slate-700">
                    <button id="back-btn" class="back-btn font-bold py-2 px-4 rounded-full shadow-lg">← Back</button>
                    <h1 class="text-3xl sm:text-4xl font-bold">🏆 Achievements</h1>
                    <div class="w-20 text-right font-bold text-lg">${unlocked.size} / ${Object.keys(achievements).length}</div>
                </header>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-6 overflow-y-auto max-h-[60vh] pr-2 chat-container">
                    ${(Object.keys(achievements) as AchievementID[]).map(id => {
                        const ach = achievements[id];
                        const isUnlocked = unlocked.has(id);
                        return `
                            <div class="achievement-item ${isUnlocked ? '' : 'locked'}">
                                <div class="text-5xl">${ach.icon}</div>
                                <div>
                                    <h2 class="text-2xl font-bold">${ach.name}</h2>
                                    <p class="text-slate-400">${ach.description}</p>
                                </div>
                            </div>
                        `;
                    }).join('')}
                </div>
            </div>
        </div>
    `;

    addBackButtonListener(() => transitionTo(renderDashboard));
};


const renderOpenChat = () => {
    const systemInstruction = getPersonalizedSystemInstruction("You are Sparky, an open-ended, friendly AI companion. Your goal is to have a pleasant and supportive conversation with the user about anything they want to talk about. Be curious and kind.");
    openChat = ai.chats.create({ model: 'gemini-2.5-flash', config: { systemInstruction } });
    const conversationHistory: ConversationTurn[] = [];

    const handleSendMessage = async (message: string) => {
        const response = await openChat!.sendMessage({ message });
        const aiTurn: ConversationTurn = { role: 'model', text: response.text };
        conversationHistory.push(aiTurn);
    };

    const userAvatar = localStorage.getItem('userAvatar') as UserAvatarID || 'star';

    renderChatInterface({
        title: 'Open Chat',
        subtitle: 'Talk about anything with Sparky!',
        onBack: () => transitionTo(renderDashboard),
        onMessageSent: handleSendMessage,
        conversationHistory: conversationHistory,
        aiAvatar: avatars.ai.Sparky,
        userAvatar: avatars.user[userAvatar],
    });
};

const renderTherapistChat = () => {
    const systemInstruction = getPersonalizedSystemInstruction("You are Bloom, a virtual AI therapist. Your primary goal is to help the user navigate their feelings and challenges using principles of Cognitive Behavioral Therapy (CBT). Be empathetic, ask guiding questions, and provide supportive, actionable advice. Avoid giving definitive medical advice. Start by warmly introducing yourself and asking what's on the user's mind.");
    aiTherapistChat = ai.chats.create({ model: 'gemini-2.5-flash', config: { systemInstruction } });
    const conversationHistory: ConversationTurn[] = [];

    const handleSendMessage = async (message: string) => {
        const response = await aiTherapistChat!.sendMessage({ message });
        const aiTurn: ConversationTurn = { role: 'model', text: response.text };
        conversationHistory.push(aiTurn);
    };
    
    const userAvatar = localStorage.getItem('userAvatar') as UserAvatarID || 'star';

    renderChatInterface({
        title: 'AI Therapist',
        subtitle: 'A safe space to talk with Bloom',
        onBack: () => transitionTo(renderDashboard),
        onMessageSent: handleSendMessage,
        conversationHistory: conversationHistory,
        aiAvatar: avatars.ai.Bloom,
        userAvatar: avatars.user[userAvatar],
    });
};

const renderSettings = () => {
    if (!root) return;
    const savedTheme = localStorage.getItem('selectedTheme') || 'nebula';
    const savedMood = localStorage.getItem('selectedMood') || 'default';
    const userProfile = JSON.parse(localStorage.getItem('userProfile') || '{}');
    const userAvatar = localStorage.getItem('userAvatar') || 'star';

    root.innerHTML = `
        <div class="min-h-screen flex flex-col items-center justify-center p-4 animate-fade-in">
            <div class="content-card max-w-2xl w-full p-8 sm:p-10 rounded-2xl shadow-2xl text-white">
                <header class="flex items-center justify-between pb-4 mb-8 border-b border-slate-700">
                    <button id="back-btn" class="back-btn font-bold py-2 px-4 rounded-full shadow-lg">← Back</button>
                    <h1 class="text-3xl sm:text-4xl font-bold">⚙️ Settings</h1>
                    <div class="w-20"></div>
                </header>

                <!-- Profile Section -->
                <div class="mb-8">
                    <h2 class="text-xl font-bold mb-4">Your Profile</h2>
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <input id="username" type="text" placeholder="Username" class="bg-slate-800 border border-slate-700 rounded-lg p-3" value="${userProfile.username || ''}">
                        <input id="age" type="number" placeholder="Age" class="bg-slate-800 border border-slate-700 rounded-lg p-3" value="${userProfile.age || ''}">
                         <select id="gender" class="bg-slate-800 border border-slate-700 rounded-lg p-3">
                            <option value="prefer_not_to_say" ${userProfile.gender === 'prefer_not_to_say' ? 'selected' : ''}>Gender (Optional)</option>
                            <option value="male" ${userProfile.gender === 'male' ? 'selected' : ''}>Male</option>
                            <option value="female" ${userProfile.gender === 'female' ? 'selected' : ''}>Female</option>
                            <option value="non-binary" ${userProfile.gender === 'non-binary' ? 'selected' : ''}>Non-binary</option>
                            <option value="other" ${userProfile.gender === 'other' ? 'selected' : ''}>Other</option>
                        </select>
                        <input id="status" type="text" placeholder="e.g., Student, Professional" class="bg-slate-800 border border-slate-700 rounded-lg p-3" value="${userProfile.status || ''}">
                        <input id="hobby" type="text" placeholder="Your favorite hobby" class="bg-slate-800 border border-slate-700 rounded-lg p-3" value="${userProfile.hobby || ''}">
                        <textarea id="purpose" placeholder="What do you want to achieve with BloomOut?" class="bg-slate-800 border border-slate-700 rounded-lg p-3 md:col-span-2 resize-none" rows="2">${userProfile.purpose || ''}</textarea>
                    </div>
                </div>

                <!-- Avatar Section -->
                 <div class="mb-8">
                    <h2 class="text-xl font-bold mb-4">Choose Your Avatar</h2>
                    <div class="flex flex-wrap justify-center gap-3">
                        ${Object.entries(avatars.user).map(([id, emoji]) => `
                             <button class="avatar-option ${id === userAvatar ? 'selected' : ''}" data-avatar="${id}">${emoji}</button>
                        `).join('')}
                    </div>
                </div>


                <!-- Theme Section -->
                <div class="mb-8">
                    <h2 class="text-xl font-bold mb-4">Choose Your Theme</h2>
                    <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
                        ${Object.entries(themes).map(([key, theme]) => `
                            <div class="theme-card p-2 rounded-lg ${key === savedTheme ? 'selected' : ''}" data-theme="${key}">
                                <div class="theme-swatch" style="background: ${theme.gradient};"></div>
                                <p class="text-center font-semibold">${theme.name}</p>
                            </div>
                        `).join('')}
                    </div>
                </div>
                
                 <!-- Mood Section -->
                <div class="mood-selector">
                    <p>Interface Mood</p>
                    <div class="mood-options">
                        <button class="mood-btn ${savedMood === 'default' ? 'active' : ''}" data-mood="default">✨ Default</button>
                        <button class="mood-btn ${savedMood === 'calm' ? 'active' : ''}" data-mood="calm">🌙 Calm</button>
                    </div>
                </div>

                <div class="flex justify-center mt-6">
                    <button id="save-settings-btn" class="duration-btn font-bold text-lg py-3 px-8 rounded-full shadow-lg">Save Settings</button>
                </div>
            </div>
        </div>
    `;

    addBackButtonListener(() => transitionTo(renderDashboard));

    document.querySelectorAll('.theme-card').forEach(card => {
        card.addEventListener('click', () => {
            document.querySelector('.theme-card.selected')?.classList.remove('selected');
            card.classList.add('selected');
            const themeName = card.getAttribute('data-theme');
            if (themeName) {
                applyTheme(themeName);
            }
        });
    });

     document.querySelectorAll('.mood-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelector('.mood-btn.active')?.classList.remove('active');
            btn.classList.add('active');
            const mood = btn.getAttribute('data-mood') as 'default' | 'calm' | null;
            if (mood) {
                applyMood(mood);
            }
        });
    });

    document.querySelectorAll('.avatar-option').forEach(btn => {
        btn.addEventListener('click', () => {
             document.querySelector('.avatar-option.selected')?.classList.remove('selected');
             btn.classList.add('selected');
        });
    });

    document.getElementById('save-settings-btn')?.addEventListener('click', () => {
        const newProfile = {
            username: (document.getElementById('username') as HTMLInputElement).value,
            age: (document.getElementById('age') as HTMLInputElement).value,
            gender: (document.getElementById('gender') as HTMLSelectElement).value,
            status: (document.getElementById('status') as HTMLInputElement).value,
            hobby: (document.getElementById('hobby') as HTMLInputElement).value,
            purpose: (document.getElementById('purpose') as HTMLTextAreaElement).value,
        };
        localStorage.setItem('userProfile', JSON.stringify(newProfile));

        const selectedAvatar = document.querySelector('.avatar-option.selected')?.getAttribute('data-avatar');
        if (selectedAvatar) {
            localStorage.setItem('userAvatar', selectedAvatar);
        }

        // Theme and mood are saved on click, but we can re-save here for consistency
        const selectedTheme = document.querySelector('.theme-card.selected')?.getAttribute('data-theme');
        if (selectedTheme) localStorage.setItem('selectedTheme', selectedTheme);
        const selectedMood = document.querySelector('.mood-btn.active')?.getAttribute('data-mood');
        if (selectedMood) localStorage.setItem('selectedMood', selectedMood);
        
        transitionTo(renderDashboard);
    });
};


const renderDashboard = () => {
    if (!root) return;
    const userProfile = JSON.parse(localStorage.getItem('userProfile') || '{}');
    const username = userProfile.username || 'friend';
    
    root.innerHTML = `
        <div class="min-h-screen flex flex-col items-center justify-center p-4 animate-fade-in">
            <div class="content-card max-w-4xl w-full p-8 sm:p-10 rounded-2xl shadow-2xl text-white">
                <header class="text-center mb-10">
                    <h1 class="text-4xl sm:text-5xl font-bold">Welcome, ${username}!</h1>
                    <p class="text-lg text-slate-300 mt-2">What would you like to do today?</p>
                </header>
                <main class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <div id="practice-scenarios" class="feature-card p-6 rounded-xl">
                        <div class="text-4xl mb-3">🎭</div>
                        <h2 class="text-2xl font-bold">Practice Scenarios</h2>
                        <p class="text-slate-300">Hone your conversation skills in various situations.</p>
                    </div>
                    <div id="journal-zone" class="feature-card p-6 rounded-xl">
                        <div class="text-4xl mb-3">✍️</div>
                        <h2 class="text-2xl font-bold">Journal & Reflection Zone</h2>
                        <p class="text-slate-300">Document your thoughts and analyze your feelings.</p>
                    </div>
                     <div id="anxiety-relief" class="feature-card p-6 rounded-xl">
                        <div class="text-4xl mb-3">🍃</div>
                        <h2 class="text-2xl font-bold">Anxiety Relief</h2>
                        <p class="text-slate-300">Calm your mind with breathing and venting exercises.</p>
                    </div>
                    <div id="open-chat" class="feature-card p-6 rounded-xl">
                        <div class="text-4xl mb-3">💡</div>
                        <h2 class="text-2xl font-bold">Open Chat</h2>
                        <p class="text-slate-300">Talk about anything that's on your mind.</p>
                    </div>
                    <div id="ai-therapist" class="feature-card p-6 rounded-xl">
                         <div class="text-4xl mb-3">🌸</div>
                        <h2 class="text-2xl font-bold">AI Therapist</h2>
                        <p class="text-slate-300">A safe space to talk through your feelings.</p>
                    </div>
                    <div id="achievements" class="feature-card p-6 rounded-xl">
                        <div class="text-4xl mb-3">🏆</div>
                        <h2 class="text-2xl font-bold">Achievements</h2>
                        <p class="text-slate-300">Track your progress and celebrate your growth.</p>
                    </div>
                </main>
                 <footer class="text-center mt-8">
                     <button id="settings-btn" class="bg-transparent text-slate-400 hover:text-white font-semibold py-2 px-4 rounded-full transition-colors">
                        ⚙️ Settings
                    </button>
                </footer>
            </div>
        </div>
    `;

    document.getElementById('practice-scenarios')?.addEventListener('click', () => transitionTo(renderPracticeScenarios));
    document.getElementById('open-chat')?.addEventListener('click', () => transitionTo(renderOpenChat));
    document.getElementById('ai-therapist')?.addEventListener('click', () => transitionTo(renderTherapistChat));
    document.getElementById('settings-btn')?.addEventListener('click', () => transitionTo(renderSettings));
    document.getElementById('anxiety-relief')?.addEventListener('click', () => transitionTo(renderAnxietyReliefZone));
    document.getElementById('achievements')?.addEventListener('click', () => transitionTo(renderAchievementsScreen));
    document.getElementById('journal-zone')?.addEventListener('click', () => transitionTo(renderJournalZone));
};


const renderOnboardingScreen = () => {
    if (!root) return;

    const steps = [
        {
            icon: '🌟',
            title: 'Welcome to BloomOut!',
            text: 'Your personal space to grow confidence, manage anxiety, and thrive in your social life. Let\'s take a quick tour of your new toolkit.'
        },
        {
            icon: '🎭',
            title: 'Practice Makes Progress',
            text: 'Hone your conversation skills in realistic scenarios, from casual chats to professional settings. Get instant, kind feedback to help you improve.'
        },
        {
            icon: '✍️',
            title: 'Your Private Journal',
            text: 'A safe space to write down your thoughts. Add doodles, images, and even ask our AI therapist, Bloom, for a gentle analysis of your entry.'
        },
        {
            icon: '🍃',
            title: 'Find Your Calm',
            text: 'Feeling overwhelmed? Use our guided breathing exercises to ground yourself, or write down your worries and send them flying away with our \'Let It Go\' tool.'
        },
        {
            icon: '🌸💡',
            title: 'Always Here to Listen',
            text: 'Chat with Bloom, our AI therapist, for supportive guidance, or have a lighthearted conversation with Sparky, your friendly AI companion.'
        },
        {
            icon: '🏆',
            title: 'Celebrate Your Wins',
            text: 'Unlock achievements as you complete activities and reach new milestones. Watch yourself grow every step of the way!'
        },
        {
            icon: '✨',
            title: 'Let\'s Get Personal',
            text: 'To get started, tell us a bit about yourself. This is optional and helps us personalize your experience. You can change this anytime in settings.',
            isFinal: true
        }
    ];

    let currentStep = 0;

    const renderCurrentStep = () => {
        const step = steps[currentStep];
        root.innerHTML = `
            <div class="min-h-screen flex flex-col items-center justify-center p-4 animate-fade-in">
                <div class="content-card max-w-2xl w-full p-8 sm:p-10 rounded-2xl shadow-2xl text-white text-center flex flex-col items-center">
                    <div class="onboarding-content">
                        <div class="text-6xl mb-4">${step.icon}</div>
                        <h1 class="text-3xl sm:text-4xl font-bold mb-4">${step.title}</h1>
                        <p class="text-lg text-slate-300 mb-8">${step.text}</p>
                        ${step.isFinal ? `
                            <div class="grid grid-cols-1 md:grid-cols-2 gap-4 w-full max-w-lg mb-8">
                                <input id="username" type="text" placeholder="What should we call you?" class="bg-slate-800 bg-opacity-70 border border-slate-700 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-indigo-500">
                                <input id="purpose" type="text" placeholder="What's your main goal here?" class="bg-slate-800 bg-opacity-70 border border-slate-700 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-indigo-500">
                            </div>
                        ` : ''}
                    </div>

                    <div class="onboarding-progress-dots mt-auto mb-8">
                        ${steps.map((_, index) => `<div class="progress-dot ${index === currentStep ? 'active' : ''}"></div>`).join('')}
                    </div>

                    <div class="flex justify-between w-full">
                        <button id="prev-btn" class="back-btn font-bold py-3 px-8 rounded-full shadow-lg" ${currentStep === 0 ? 'style="visibility: hidden;"' : ''}>Back</button>
                        ${step.isFinal ? `
                            <button id="start-btn" class="begin-btn font-bold text-lg py-3 px-8 rounded-full shadow-lg">Start My Journey</button>
                        ` : `
                            <button id="next-btn" class="duration-btn font-bold text-lg py-3 px-8 rounded-full shadow-lg">Next</button>
                        `}
                    </div>
                </div>
            </div>
        `;
        addListeners();
    };

    const addListeners = () => {
        document.getElementById('next-btn')?.addEventListener('click', () => {
            if (currentStep < steps.length - 1) {
                currentStep++;
                renderCurrentStep();
            }
        });

        document.getElementById('prev-btn')?.addEventListener('click', () => {
            if (currentStep > 0) {
                currentStep--;
                renderCurrentStep();
            }
        });
        
        document.getElementById('start-btn')?.addEventListener('click', () => {
            const profile = {
                username: (document.getElementById('username') as HTMLInputElement).value || 'friend',
                purpose: (document.getElementById('purpose') as HTMLInputElement).value || '',
            };
            localStorage.setItem('userProfile', JSON.stringify(profile));
            localStorage.setItem('bloomout_has_launched', 'true');
            transitionTo(renderDashboard);
        });
    };

    renderCurrentStep();
};

// --- INITIALIZATION ---

const initializeApp = () => {
    loadTheme();
    loadMood();
    if (localStorage.getItem('bloomout_has_launched')) {
        renderDashboard();
    } else {
        renderOnboardingScreen();
    }
};

initializeApp();