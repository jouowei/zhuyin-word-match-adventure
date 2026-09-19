
import React, { useEffect, useState } from 'react';
import { GameState, RewardCard } from './types';
import { englishStatKey, masteredCount, reviewWords, statKey, todayKey } from './services/learningStats';
import { englishSentenceWords } from './services/englishPath';
import { buyCard, claimMilestoneCard, milestonesAvailable } from './services/rewards';
import { focusName, studyFor } from './services/wordSources';
import { playSound } from './utils/sound';
import { useScreen } from './hooks/useScreen';
import { useFamilyData } from './hooks/useFamilyData';
import { useRewardImages } from './hooks/useRewardImages';
import { useAnswers } from './hooks/useAnswers';
import { useChineseRound } from './hooks/useChineseRound';
import { useEnglishRound } from './hooks/useEnglishRound';
import { useReadingLoops } from './hooks/useReadingLoops';
import { useDailyPath } from './hooks/useDailyPath';
import { PathLink } from './hooks/pathLink';
import { CelebrationBanner, useCelebration } from './components/Celebration';
import { BrowserNotice } from './components/BrowserNotice';
import { OfflineNotice } from './components/OfflineNotice';
import { PraiseBurst } from './components/Praise';

// View Components
import { LoginView } from './components/LoginView';
import { HomeView } from './components/HomeView';
import { CompanionPickView } from './components/CompanionPickView';
import { PlaygroundTile, PlaygroundView } from './components/PlaygroundView';
import { ModePickView } from './components/ModePickView';
import { PracticeLessonsView } from './components/PracticeLessonsView';
import { DifficultySelectView } from './components/DifficultySelectView';
import { ChineseRoundView } from './components/ChineseRoundView';
import { ShopView } from './components/ShopView';
import { VictoryView } from './components/VictoryView';
import { LoadingView } from './components/LoadingView';
import { LeaderboardView } from './components/LeaderboardView';
import { LessonManagerView } from './components/LessonManagerView';
import { LessonIntroView } from './components/LessonIntroView';
import { LessonLoopView } from './components/LessonLoopView';
import { ZhuyinIntroView } from './components/ZhuyinIntroView';
import { DailyPathView } from './components/DailyPathView';
import { LearnNewView } from './components/LearnNewView';
import { ParentReportView } from './components/ParentReportView';
import { EnglishHubView } from './components/english/EnglishHubView';
import { AlphabetChartView } from './components/english/AlphabetChartView';
import { EnglishUnitIntroView } from './components/english/EnglishUnitIntroView';
import { EnglishLevelSelectView } from './components/english/EnglishLevelSelectView';
import { EnglishRoundView } from './components/english/EnglishRoundView';
import { EnglishLearnView } from './components/english/EnglishLearnView';
import { EnglishSentenceLoopView } from './components/english/EnglishSentenceLoopView';
import { EnglishUnitManagerView } from './components/english/EnglishUnitManagerView';

/**
 * Puts the parts of the game together and shows the current screen. The parts:
 * - hooks/useFamilyData: players, lessons and English units (familyStore), and who is playing
 * - hooks/useAnswers: points, spaced review and the parent report for each answer (rules in services/answers)
 * - hooks/useChineseRound, hooks/useEnglishRound: the game rounds
 * - hooks/useReadingLoops: back to the lesson text or the English sentences
 * - hooks/useDailyPath: 今日冒險 and 今日英文冒險, which start the rounds above as stations
 * After choosing a player, two ways to go:
 * - 環島冒險, the learning game: home (the map around Taiwan, the garden, the companion) → today's adventure,
 *   then the 遊樂場 with every game.
 * - 練習課文: the child picks a lesson, hears it, finds its words and plays its word games.
 * The parent's side (家長專區, behind the password): what the adventure practises, lessons, English words, stars.
 */
export default function App() {
  const screen = useScreen();
  const family = useFamilyData({ onPlayerRemoved: () => screen.goTo(GameState.LOGIN) });
  const images = useRewardImages(screen.current);
  const { celebration, celebrate } = useCelebration();
  const [victoryFrom, setVictoryFrom] = useState<'chinese' | 'english'>('chinese');
  const showVictory = (from: 'chinese' | 'english') => {
    setVictoryFrom(from);
    screen.goTo(GameState.VICTORY);
  };

  // Rounds report back to 今日冒險 when they end. The path starts the rounds, so it is set up after them:
  // these are only called later, from the rounds' events.
  const toPath: PathLink = {
    finish: result => adventure.finishStation(result),
    replay: level => adventure.launchStation(level),
    mastered: label => adventure.noteMastered(label),
  };
  const answers = useAnswers({ family, celebrate, onMasteredInPath: toPath.mastered });
  const chinese = useChineseRound({ family, screen, answers, path: toPath, onVictory: () => showVictory('chinese') });
  const english = useEnglishRound({ family, screen, answers, path: toPath, onVictory: () => showVictory('english') });
  const loops = useReadingLoops({ screen, answers, celebrate, path: toPath });
  const adventure = useDailyPath({ family, screen, answers, chinese, english, loops });

  const { currentUser, lessons } = family;

  // 家長專區 stays open while the parent moves between its pages, until back on the child's side
  const [parentUnlocked, setParentUnlocked] = useState(false);
  const [parentBack, setParentBack] = useState<GameState>(GameState.MODE_PICK); // Where 家長專區 was opened from
  useEffect(() => {
    if ([GameState.MENU, GameState.LOGIN, GameState.MODE_PICK].includes(screen.current)) setParentUnlocked(false);
  }, [screen.current]);
  const openParent = () => {
    setParentBack(screen.current);
    screen.goTo(GameState.PARENT_REPORT);
  };

  // 練習課文 or 環島冒險 (which starts with choosing a companion)
  const startAdventure = () => {
    chinese.setPracticeLesson(null);
    screen.goTo(currentUser?.companion ? GameState.MENU : GameState.COMPANION_PICK);
  };
  const practising = !!chinese.practiceLesson;

  // Check for API Key in URL
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const keyFromUrl = params.get('key');
      if (keyFromUrl) {
        localStorage.setItem('gemini_api_key', keyFromUrl);
        window.history.replaceState({}, document.title, window.location.pathname);
      }
    }
  }, []);

  const purchaseCard = (card: RewardCard) => {
    if (!currentUser) return;
    const changes = buyCard(currentUser, card);
    if (changes) {
      family.updateUser(currentUser.id, changes);
      playSound('success');
    } else {
      playSound('error');
    }
  };

  const claimMilestone = (card: RewardCard) => {
    const changes = currentUser && claimMilestoneCard(currentUser, card);
    if (!currentUser || !changes) return;
    family.updateUser(currentUser.id, changes);
    playSound('magic');
    celebrate(`送你「${card.title}」！`);
  };

  // --- RENDER ---

  if (screen.busy) return <LoadingView />;

  return (
    <>
      {renderScreen()}
      <BrowserNotice />
      <OfflineNotice />
      <PraiseBurst />
      <CelebrationBanner celebration={celebration} />
    </>
  );

  function renderScreen() {
  const { goTo } = screen;
  const { activeLesson } = chinese;
  switch (screen.current) {
    case GameState.LOGIN:
      return (
        <LoginView
          users={family.users}
          onLogin={(u) => { family.login(u); goTo(GameState.MODE_PICK); }}
          onCreateUser={(name, avatar) => { family.createUser(name, avatar); goTo(GameState.MODE_PICK); }}
        />
      );

    case GameState.MODE_PICK:
      if (!currentUser) return null;
      return (
        <ModePickView
          currentUser={currentUser}
          onAdventure={startAdventure}
          onPractice={() => goTo(GameState.PRACTICE_LESSONS)}
          onSwitchPlayer={() => { family.logout(); goTo(GameState.LOGIN); }}
          onParent={openParent}
        />
      );

    case GameState.PRACTICE_LESSONS:
      if (!currentUser) return null;
      return (
        <PracticeLessonsView
          currentUser={currentUser}
          lessons={lessons}
          onPick={lesson => { chinese.setReviewMode(false); chinese.setPracticeLesson(lesson); goTo(GameState.LESSON_INTRO); }}
          onBack={() => { chinese.setPracticeLesson(null); goTo(GameState.MODE_PICK); }}
        />
      );

    case GameState.COMPANION_PICK:
      if (!currentUser) return null;
      return (
        <CompanionPickView
          currentUser={currentUser}
          onPick={id => { family.updateUser(currentUser.id, { companion: id }); goTo(GameState.MENU); }}
        />
      );

    case GameState.MENU: {
      if (!currentUser) return null;
      const focus = studyFor(currentUser.studyFocus, lessons);
      const milestones = milestonesAvailable(currentUser);
      return (
        <HomeView
          currentUser={currentUser}
          focusName={focusName(focus)}
          focusBadge={focus.gameMode === 'zhuyin' ? 'ㄅㄆㄇ' : focus.activeLesson ? focus.activeLesson.title : '全部課文'}
          chineseDone={currentUser.lastDailyPath === todayKey()}
          englishDone={currentUser.lastEnglishPath === todayKey()}
          stationsLeft={adventure.chineseStationsLeft()}
          rewardBadge={currentUser.freeSpins ? '免費轉蛋' : milestones > 0 ? '可以選卡' : ''}
          onGo={() => { chinese.setReviewMode(false); adventure.start(); }}
          onEnglish={adventure.startEnglish}
          onRewards={() => { images.retryImages(); goTo(GameState.SHOP); }}
          onPlayground={() => goTo(GameState.PLAYGROUND)}
          onParent={openParent}
          onModes={() => goTo(GameState.MODE_PICK)}
          onStorySeen={step => family.updateUser(currentUser.id, { journeySeen: step })}
        />
      );
    }

    case GameState.PLAYGROUND: {
      if (!currentUser) return null;
      const reviewCount = reviewWords(currentUser.wordStats).filter(w => lessons.some(l => l.vocabulary.includes(w))).length;
      const zhuyin = studyFor(currentUser.studyFocus, lessons).gameMode === 'zhuyin';
      const tiles: (PlaygroundTile | false)[] = [
        {
          id: 'chinese', emoji: '🎮', label: zhuyin ? '注音遊戲' : '國字遊戲', color: 'bg-indigo-400 text-white',
          say: zhuyin ? '注音遊戲：選一個遊戲，練習注音符號。' : '國字遊戲：選一個遊戲，練習課文的字。',
          onOpen: () => { chinese.setReviewMode(false); goTo(GameState.DIFFICULTY_SELECT); },
        },
        reviewCount > 0 && {
          id: 'review', emoji: '🔁', label: `複習 ${reviewCount} 個字`, color: 'bg-orange-400 text-white',
          say: `複習時間：有${reviewCount}個字要再練習一次。`,
          onOpen: () => { chinese.setReviewMode(true); goTo(GameState.DIFFICULTY_SELECT); },
        },
        activeLesson
          ? { id: 'lesson', emoji: '📖', label: '聽課文', color: 'bg-sky-400 text-white', say: `聽課文：${activeLesson.title}`, onOpen: () => goTo(GameState.LESSON_INTRO) }
          : { id: 'zhuyin-chart', emoji: 'ㄅ', label: '注音表', color: 'bg-sky-400 text-white', say: '注音表：點每個注音，聽它怎麼唸。', onOpen: () => goTo(GameState.ZHUYIN_INTRO) },
        { id: 'english', emoji: '🔤', label: '英文遊戲', color: 'bg-pink-400 text-white', say: '英文遊戲：選一個英文單元來玩。', onOpen: () => goTo(GameState.ENGLISH_HUB) },
        { id: 'alphabet', emoji: '🔠', label: '字母表', color: 'bg-rose-300 text-rose-900', say: '字母表：點每個字母，聽它怎麼唸。', onOpen: () => goTo(GameState.ENGLISH_ALPHABET) },
        { id: 'leaderboard', emoji: '🏆', label: '榮譽榜', color: 'bg-amber-300 text-amber-900', say: '榮譽榜：看看大家得到幾顆星星。', onOpen: () => goTo(GameState.LEADERBOARD) },
      ];
      return <PlaygroundView currentUser={currentUser} tiles={tiles.filter((t): t is PlaygroundTile => !!t)} onHome={() => goTo(GameState.MENU)} />;
    }

    case GameState.LESSON_SELECT:
      return (
        <LessonManagerView
           lessons={lessons}
           progress={currentUser?.zhuyinProgress}
           onSelectLesson={(lesson) => {
              if (currentUser) family.updateUser(currentUser.id, { studyFocus: { kind: 'lesson', lessonId: lesson.id } });
              goTo(GameState.PARENT_REPORT);
           }}
           onUpdateLessons={family.setLessons}
           onBack={() => goTo(GameState.PARENT_REPORT)}
           backLabel="回家長專區"
           title="課文（點一課，設為孩子正在學的）"
        />
      );

    case GameState.LESSON_INTRO:
      if (!activeLesson) return null;
      return (
        <LessonIntroView
           lesson={activeLesson}
           onStartGame={() => goTo(GameState.DIFFICULTY_SELECT)}
           onBack={() => goTo(practising ? GameState.PRACTICE_LESSONS : GameState.PLAYGROUND)}
           onFindWords={() => loops.startLessonFind(activeLesson)}
        />
      );

    case GameState.LESSON_LOOP: {
      const { lessonLoop } = loops;
      if (!currentUser || !activeLesson || !lessonLoop) return null;
      return (
        <LessonLoopView
          key={`${lessonLoop.mode}-${lessonLoop.targets.join()}`}
          currentUser={currentUser}
          lesson={activeLesson}
          mode={lessonLoop.mode}
          targets={lessonLoop.targets}
          onDone={loops.lessonLoopDone}
          onMistake={word => answers.recordMistake(statKey('word', word), undefined, false)}
          onBack={() => goTo(lessonLoop.fromPath ? GameState.DAILY_PATH : GameState.LESSON_INTRO)}
        />
      );
    }

    case GameState.PARENT_REPORT:
      if (!currentUser) return null;
      return (
        <ParentReportView
          currentUser={currentUser}
          lessons={lessons}
          englishUnits={family.englishUnits}
          activeLesson={activeLesson}
          onBack={() => goTo(parentBack)}
          unlocked={parentUnlocked}
          onUnlock={() => setParentUnlocked(true)}
          onUpdateUser={family.updateUser}
          onManageLessons={() => goTo(GameState.LESSON_SELECT)}
          onManageEnglish={() => goTo(GameState.ENGLISH_MANAGER)}
          onDeletePlayer={() => {
            family.deleteUser(currentUser.id);
            family.logout();
            goTo(GameState.LOGIN);
          }}
        />
      );

    case GameState.ZHUYIN_INTRO:
      return (
        <ZhuyinIntroView
           onStartGame={() => goTo(GameState.DIFFICULTY_SELECT)}
           onBack={() => goTo(GameState.PLAYGROUND)}
        />
      );

    case GameState.DIFFICULTY_SELECT:
      return (
        <DifficultySelectView
          onSelect={level => chinese.start(level)}
          onBack={() => {
            chinese.setReviewMode(false);
            goTo(practising ? GameState.LESSON_INTRO : GameState.PLAYGROUND);
          }}
          activeLesson={chinese.reviewMode ? null : activeLesson}
          gameMode={chinese.gameMode}
          reviewMode={chinese.reviewMode}
          completedLevels={chinese.progressKey ? currentUser?.zhuyinProgress?.[chinese.progressKey] || [] : []}
        />
      );

    case GameState.DAILY_PATH: {
      const { dailyPath } = adventure;
      if (!currentUser || !dailyPath) return null;
      return (
        <DailyPathView
          path={dailyPath}
          currentUser={currentUser}
          onStart={adventure.launchStation}
          onHome={() => goTo(GameState.MENU)}
          onShop={() => goTo(GameState.SHOP)}
          optionInfo={dailyPath.language === 'en' ? adventure.englishOptionInfo : undefined}
        />
      );
    }

    case GameState.LEARN_NEW:
      if (!currentUser || !adventure.dailyPath) return null;
      return (
        <LearnNewView
          currentUser={currentUser}
          cards={adventure.learnCards}
          gameMode={adventure.dailyPath.gameMode}
          onDone={adventure.learnDone}
          onBack={() => goTo(GameState.DAILY_PATH)}
        />
      );

    case GameState.PLAYING:
      if (!currentUser) return null;
      return (
        <ChineseRoundView
          currentUser={currentUser}
          level={chinese.level}
          gameMode={chinese.gameMode}
          words={chinese.words}
          familyQuestions={chinese.familyQuestions}
          radicalQuestions={chinese.radicalQuestions}
          onMatch={chinese.onMatch}
          onMistake={chinese.onMistake}
          onHome={chinese.leave}
          onRefresh={chinese.again}
        />
      );

    case GameState.SHOP:
      if (!currentUser) return null;
      return (
        <ShopView
          currentUser={currentUser}
          rewardImages={images.rewardImages}
          imageRefreshVersion={images.imageRefreshVersion}
          imageLoadErrors={images.imageLoadErrors}
          onBack={() => goTo(GameState.MENU)}
          onPurchase={purchaseCard}
          masteredCount={masteredCount(currentUser.wordStats)}
          milestonesAvailable={milestonesAvailable(currentUser)}
          onClaimMilestone={claimMilestone}
          onUpdateUser={family.updateUser}
          onFileUpload={images.onFileUpload}
          onImageError={images.onImageError}
        />
      );

    case GameState.LEADERBOARD:
      return <LeaderboardView users={family.users} onBack={() => goTo(GameState.PLAYGROUND)} />;

    case GameState.VICTORY:
      if (victoryFrom === 'english') {
        return (
          <VictoryView
            homeLabel="回英文遊戲"
            onHome={english.goToHub}
            onReplay={() => english.start(english.level)}
          />
        );
      }
      return (
        <VictoryView
          homeLabel={practising ? '回課文' : '回遊樂場'}
          onHome={() => { chinese.setReviewMode(false); goTo(practising ? GameState.LESSON_INTRO : GameState.PLAYGROUND); }}
          onReplay={() => chinese.start()}
        />
      );

    case GameState.ENGLISH_HUB:
      if (!currentUser) return null;
      return (
        <EnglishHubView
          currentUser={currentUser}
          customUnits={family.englishUnits}
          onBack={() => goTo(GameState.PLAYGROUND)}
          onOpenUnit={english.openUnit}
          onAlphabet={() => goTo(GameState.ENGLISH_ALPHABET)}
        />
      );

    case GameState.ENGLISH_ALPHABET:
      return <AlphabetChartView onBack={() => goTo(GameState.PLAYGROUND)} />;

    case GameState.ENGLISH_MANAGER:
      return (
        <EnglishUnitManagerView
          units={family.englishUnits}
          onSaveUnits={family.setEnglishUnits}
          onBack={() => goTo(GameState.PARENT_REPORT)}
        />
      );

    case GameState.ENGLISH_UNIT_INTRO: {
      const unit = english.activeUnit;
      if (!unit) return null;
      return (
        <EnglishUnitIntroView
          unit={unit}
          onBack={english.goToHub}
          onStartGame={() => goTo(GameState.ENGLISH_LEVEL_SELECT)}
          onFindWords={englishSentenceWords(unit, (unit.words || []).map(w => w.word)).length ? () => loops.startEnglishFind(unit) : undefined}
        />
      );
    }

    case GameState.ENGLISH_LEARN:
      if (!currentUser) return null;
      return (
        <EnglishLearnView
          currentUser={currentUser}
          cards={adventure.englishLearnCards}
          onDone={adventure.englishLearnDone}
          onBack={() => goTo(GameState.DAILY_PATH)}
        />
      );

    case GameState.ENGLISH_SENTENCES: {
      const { englishLoop } = loops;
      if (!currentUser || !englishLoop) return null;
      return (
        <EnglishSentenceLoopView
          key={`${englishLoop.mode}-${englishLoop.targets.join()}`}
          currentUser={currentUser}
          unit={englishLoop.unit}
          mode={englishLoop.mode}
          targets={englishLoop.targets}
          onDone={loops.englishLoopDone}
          onMistake={word => answers.recordMistake(englishStatKey({ kind: 'word', text: word }), undefined, false)}
          onBack={() => goTo(englishLoop.fromPath ? GameState.DAILY_PATH : GameState.ENGLISH_UNIT_INTRO)}
        />
      );
    }

    case GameState.ENGLISH_LEVEL_SELECT: {
      const unit = english.activeUnit;
      if (!unit || !currentUser) return null;
      return (
        <EnglishLevelSelectView
          unit={unit}
          completedLevels={currentUser.englishProgress?.[unit.id] || []}
          onSelect={level => english.start(level)}
          onBack={() => goTo(unit.stage === 0 ? GameState.ENGLISH_HUB : GameState.ENGLISH_UNIT_INTRO)}
        />
      );
    }

    case GameState.ENGLISH_PLAYING:
      if (!currentUser || !english.activeUnit) return null;
      return (
        <EnglishRoundView
          currentUser={currentUser}
          unit={english.activeUnit}
          level={english.level}
          items={english.items}
          rhymeQuestions={english.rhymeQuestions}
          onMatch={english.onMatch}
          onMistake={english.onMistake}
          onHome={english.leave}
          onRefresh={english.again}
        />
      );

    default:
      return null;
  }
  }
}
