
import React, { useEffect, useState } from 'react';
import { GameState, RewardCard } from './types';
import { englishStatKey, masteredCount, reviewWords, statKey, todayKey } from './services/learningStats';
import { englishSentenceWords } from './services/englishPath';
import { buyCard, claimMilestoneCard, milestonesAvailable } from './services/rewards';
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
import { MenuView } from './components/MenuView';
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
          onLogin={(u) => { family.login(u); goTo(GameState.MENU); }}
          onCreateUser={(name, avatar) => { family.createUser(name, avatar); goTo(GameState.MENU); }}
          onDeleteUser={family.deleteUser}
        />
      );

    case GameState.MENU:
      return currentUser ? (
        <MenuView
          currentUser={currentUser}
          currentVocabulary={[]} // Not used anymore
          activeLesson={activeLesson}
          onStart={() => {
            chinese.setGameMode('word');
            goTo(GameState.DIFFICULTY_SELECT);
          }}
          onZhuyinMode={() => {
            chinese.setGameMode('zhuyin');
            chinese.setActiveLesson(null);
            goTo(GameState.ZHUYIN_INTRO);
          }}
          onEnglishMode={() => goTo(GameState.ENGLISH_HUB)}
          reviewCount={reviewWords(currentUser.wordStats).filter(w => lessons.some(l => l.vocabulary.includes(w))).length}
          masteredCount={masteredCount(currentUser.wordStats)}
          onReviewMode={() => {
            chinese.setGameMode('word');
            chinese.setReviewMode(true);
            goTo(GameState.DIFFICULTY_SELECT);
          }}
          lessonProgress={activeLesson ? currentUser.zhuyinProgress?.[activeLesson.id] || [] : []}
          onLessonMode={() => {
            chinese.setGameMode('word');
            goTo(GameState.LESSON_SELECT);
          }}
          onReviewLesson={() => goTo(GameState.LESSON_INTRO)}
          onExitLesson={() => chinese.setActiveLesson(null)}
          onShop={() => {
            images.retryImages();
            goTo(GameState.SHOP);
          }}
          onLeaderboard={() => goTo(GameState.LEADERBOARD)}
          onParentReport={() => goTo(GameState.PARENT_REPORT)}
          milestonesAvailable={milestonesAvailable(currentUser)}
          onSettings={() => {}} // Disabled
          onLogout={() => { family.logout(); goTo(GameState.LOGIN); }}
          onUpdateUser={family.updateUser}
          isGenerating={screen.busy}
        />
      ) : null;

    case GameState.LESSON_SELECT:
      return (
        <LessonManagerView
           lessons={lessons}
           progress={currentUser?.zhuyinProgress}
           onSelectLesson={(lesson) => {
              chinese.setActiveLesson(lesson);
              goTo(GameState.LESSON_INTRO);
           }}
           onUpdateLessons={family.setLessons}
           onBack={() => goTo(GameState.MENU)}
        />
      );

    case GameState.LESSON_INTRO:
      if (!activeLesson) return null;
      return (
        <LessonIntroView
           lesson={activeLesson}
           onStartGame={() => goTo(GameState.DIFFICULTY_SELECT)}
           onBack={() => goTo(GameState.MENU)} // Back to Menu (Lesson Dashboard)
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
          backLabel={lessonLoop.fromPath ? '冒險地圖' : '回課文'}
        />
      );
    }

    case GameState.PARENT_REPORT:
      if (!currentUser) return null;
      return <ParentReportView currentUser={currentUser} lessons={lessons} englishUnits={family.englishUnits} activeLesson={activeLesson} onBack={() => goTo(GameState.MENU)} />;

    case GameState.ZHUYIN_INTRO:
      return (
        <ZhuyinIntroView
           onStartGame={() => goTo(GameState.DIFFICULTY_SELECT)}
           onBack={() => goTo(GameState.MENU)}
        />
      );

    case GameState.DIFFICULTY_SELECT:
      return (
        <DifficultySelectView
          onSelect={level => chinese.start(level)}
          onBack={() => {
            if (chinese.gameMode === 'zhuyin') {
              goTo(GameState.ZHUYIN_INTRO);
            } else {
              chinese.setReviewMode(false);
              goTo(activeLesson && !chinese.reviewMode ? GameState.LESSON_INTRO : GameState.MENU);
            }
          }}
          activeLesson={chinese.reviewMode ? null : activeLesson}
          gameMode={chinese.gameMode}
          reviewMode={chinese.reviewMode}
          completedLevels={chinese.progressKey ? currentUser?.zhuyinProgress?.[chinese.progressKey] || [] : []}
          onDailyPath={adventure.start}
          dailyDone={currentUser?.lastDailyPath === todayKey()}
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
          onHome={() => goTo(dailyPath.language === 'en' ? GameState.ENGLISH_HUB : GameState.MENU)}
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
      return <LeaderboardView users={family.users} onBack={() => goTo(GameState.MENU)} />;

    case GameState.VICTORY:
      if (victoryFrom === 'english') {
        return (
          <VictoryView
            onHome={english.goToHub}
            onReplay={() => english.start(english.level)}
          />
        );
      }
      return (
        <VictoryView
          onHome={() => { chinese.setReviewMode(false); goTo(GameState.MENU); }}
          onReplay={() => chinese.start()}
        />
      );

    case GameState.ENGLISH_HUB:
      if (!currentUser) return null;
      return (
        <EnglishHubView
          currentUser={currentUser}
          customUnits={family.englishUnits}
          onBack={() => goTo(GameState.MENU)}
          onOpenUnit={english.openUnit}
          onDailyPath={adventure.startEnglish}
          dailyDone={currentUser.lastEnglishPath === todayKey()}
          onAlphabet={() => goTo(GameState.ENGLISH_ALPHABET)}
          onManageCustom={() => goTo(GameState.ENGLISH_MANAGER)}
        />
      );

    case GameState.ENGLISH_ALPHABET:
      return <AlphabetChartView onBack={english.goToHub} />;

    case GameState.ENGLISH_MANAGER:
      return (
        <EnglishUnitManagerView
          units={family.englishUnits}
          onSaveUnits={family.setEnglishUnits}
          onBack={english.goToHub}
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
          backLabel={englishLoop.fromPath ? '冒險地圖' : '回單元'}
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
