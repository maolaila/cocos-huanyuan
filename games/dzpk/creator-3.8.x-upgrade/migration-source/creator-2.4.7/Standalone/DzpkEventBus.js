'use strict';

/** A target-aware event bus compatible with the original wGEvent contract. */
function DzpkEventBus() {
  this.listenerGroupsByEventName = {};
  this.nextSubscriptionId = 1;
}

DzpkEventBus.prototype.subscribeSourceEvent = function (eventName, listener, listenerTarget) {
  if (typeof listener !== 'function') throw new Error('Source event listener must be a function');
  if (!this.listenerGroupsByEventName[eventName]) this.listenerGroupsByEventName[eventName] = {};
  var subscriptionId = this.nextSubscriptionId;
  this.nextSubscriptionId += 1;
  this.listenerGroupsByEventName[eventName][subscriptionId] = {
    listener: listener,
    listenerTarget: listenerTarget || null
  };
  return { name: eventName, id: subscriptionId, target: listenerTarget || null };
};

DzpkEventBus.prototype.unsubscribeSourceEvent = function (subscription) {
  if (!subscription || !this.listenerGroupsByEventName[subscription.name]) return;
  delete this.listenerGroupsByEventName[subscription.name][subscription.id];
};

DzpkEventBus.prototype.publishSourceEvent = function (eventName) {
  var eventArguments = Array.prototype.slice.call(arguments, 1);
  var listenerGroup = this.listenerGroupsByEventName[eventName];
  if (!listenerGroup) return;
  Object.keys(listenerGroup).forEach(function (subscriptionId) {
    var subscription = listenerGroup[subscriptionId];
    if (subscription.listenerTarget && !cc.isValid(subscription.listenerTarget, true)) {
      delete listenerGroup[subscriptionId];
      return;
    }
    subscription.listener.apply(subscription.listenerTarget, eventArguments);
  });
};

DzpkEventBus.prototype.clearSourceEvent = function (eventName) {
  delete this.listenerGroupsByEventName[eventName];
};

// Thin compatibility aliases used by the original serialized scripts.
DzpkEventBus.prototype.on = DzpkEventBus.prototype.subscribeSourceEvent;
DzpkEventBus.prototype.off = DzpkEventBus.prototype.unsubscribeSourceEvent;
DzpkEventBus.prototype.emit = DzpkEventBus.prototype.publishSourceEvent;
DzpkEventBus.prototype.clear = DzpkEventBus.prototype.clearSourceEvent;

module.exports = { DzpkEventBus: DzpkEventBus };

