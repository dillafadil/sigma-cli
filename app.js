// app.js — Sigma App Core
const fs = require('fs');
const path = require('path');

const APP_VERSION = '0.1.0';
const APP_TITLE = 'sigma';
const MAX_RETRY = 3;
const TIMEOUT = 5000;

function capitalize(str) {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function truncate(str, max) {
  if (str.length <= max) return str;
  return str.slice(0, max) + '...';
}

function isEmpty(str) {
  return !str || str.trim() === '';
}

function unique(arr) {
  return [...new Set(arr)];
}

function flatten(arr) {
  return arr.reduce((acc, val) => acc.concat(val), []);
}

function chunk(arr, size) {
  const result = [];
  for (let i = 0; i < arr.length; i += size) {
    result.push(arr.slice(i, i + size));
  }
  return result;
}

function deepClone(obj) {
  return JSON.parse(JSON.stringify(obj));
}

function mergeConfig(defaults, overrides) {
  return Object.assign({}, defaults, overrides);
}

function log(level, message) {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] [${level}] ${message}`);
}

function logInfo(message) { log('INFO', message); }
function logWarn(message) { log('WARN', message); }
function logError(message) { log('ERROR', message); }

module.exports = {
  APP_VERSION,
  APP_TITLE,
  capitalize,
  truncate,
  isEmpty,
  unique,
  flatten,
  chunk,
  deepClone,
  mergeConfig,
  logInfo,
  logWarn,
  logError
};