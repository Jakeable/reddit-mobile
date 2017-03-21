import { LOCAL_STORAGE_KEYS } from 'app/constants';
import localStorageAvailable from './localStorageAvailable';
import TimeChecker from 'lib/timeChecker';

export const statusKey = {
  SHOW : 'cs.xpromo_view_s',
  HIDE: 'cs.xpromo_dismiss_h',
  BLOCK_SHOW: 'cs.xpromo_dismiss_d',
  NEW_SESSION : 'cs.xpromo_view_n',
  JUST_DISMISSED : 'cs.xpromo_view_j',
};

const { BANNER_PERSIST_SHOWED } = LOCAL_STORAGE_KEYS;

const config = { 
  showTime  : 1*10*1000,
  hideTime  : 1*20*1000,
};

/*
 * Timer and main persistent banner 
 */ 
const timer = new TimeChecker(1000);

const checkDisplayStatus = (callback, isInterstitialDismissed) => {
  const lsTime = getLocalStorage();
  const showTime = (lsTime + config.showTime);
  const hideTime = (lsTime + config.hideTime);

  const lessShowTime = (Date.now() <= showTime);
  const moreHideTime = (Date.now() > hideTime);
  const justDismiss = (isInterstitialDismissed && lessShowTime);

  if(justDismiss || !lsTime){
    sendOnce(callback, statusKey.JUST_DISMISSED);
    if(!lsTime) markPersistBannerShowed();
    return true;
  } else if(moreHideTime) {
    markPersistBannerShowed();
    sendOnce(callback, statusKey.NEW_SESSION);
    return true;
  } else if(lessShowTime) {
    sendOnce(callback, statusKey.SHOW);
    return true;
  }

  if (isPersistBannerShowed()) {
    sendOnce(callback, statusKey.HIDE);
  } else {
    sendOnce(callback, statusKey.BLOCK_SHOW);
  }
  return false;
};

export const runStatusCheck = (statusCallback, isInterstitialDismissed) => {
  timer.start(() => {
    return checkDisplayStatus(statusCallback, isInterstitialDismissed);
  });
};

/*
 * Utils for sending callback once
 * @TODO: this should be refactored,
 * aspecialy const usedStatus usage...!
 */ 
const usedStatus = [];

const sendOnce = (callback, status) => {
  if (isStatusFirst(status)) {
    return callback(status);
  }
};
const isStatusFirst = (status) => {
  if (isStatusNotExist(status)) {
    usedStatus.push(status);
    return true;
  }
  return false;
};
const isStatusNotExist = (status) => {
  return (usedStatus.indexOf(status) === -1);
};
const isPersistBannerShowed = () => {
  return !isStatusNotExist(statusKey.SHOW);
};

/*
 * Utils for working with localStorage
 */ 
const getLocalStorage = () => {
  if (localStorageAvailable()) {
    const time = localStorage.getItem(BANNER_PERSIST_SHOWED);
    return time ? (new Date(time)).getTime() : false ;
  }
};
export const markPersistBannerShowed = () => {
  if (localStorageAvailable()) {
    return localStorage.setItem(BANNER_PERSIST_SHOWED, new Date());
  }
};
