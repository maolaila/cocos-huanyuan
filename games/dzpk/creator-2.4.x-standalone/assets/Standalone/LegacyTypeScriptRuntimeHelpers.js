'use strict';

/**
 * The recovered KG JavaScript was emitted by TypeScript with `noEmitHelpers`.
 * The old Hall supplied these five globals before loading any game module.
 */
function installLegacyTypeScriptRuntimeHelpers() {
  var browserGlobal = typeof globalThis !== 'undefined' ? globalThis : window;
  if (!browserGlobal.__extends) browserGlobal.__extends = createLegacyExtendsHelper();
  if (!browserGlobal.__decorate) browserGlobal.__decorate = legacyDecorate;
  if (!browserGlobal.__awaiter) browserGlobal.__awaiter = legacyAwaiter;
  if (!browserGlobal.__generator) browserGlobal.__generator = legacyGenerator;
  if (!browserGlobal.__spreadArrays) browserGlobal.__spreadArrays = legacySpreadArrays;
}

function createLegacyExtendsHelper() {
  var setPrototype = Object.setPrototypeOf
    || ({ __proto__: [] } instanceof Array && function (childConstructor, parentConstructor) {
      childConstructor.__proto__ = parentConstructor;
    })
    || function (childConstructor, parentConstructor) {
      Object.keys(parentConstructor).forEach(function (staticPropertyName) {
        if (Object.prototype.hasOwnProperty.call(parentConstructor, staticPropertyName)) {
          childConstructor[staticPropertyName] = parentConstructor[staticPropertyName];
        }
      });
    };
  return function (childConstructor, parentConstructor) {
    if (typeof parentConstructor !== 'function' && parentConstructor !== null) {
      throw new TypeError('Class extends value is not a constructor or null');
    }
    setPrototype(childConstructor, parentConstructor);
    function IntermediatePrototype() {
      this.constructor = childConstructor;
    }
    childConstructor.prototype = parentConstructor === null
      ? Object.create(parentConstructor)
      : (IntermediatePrototype.prototype = parentConstructor.prototype, new IntermediatePrototype());
  };
}

function legacyDecorate(decorators, decoratedTarget, propertyKey, propertyDescriptor) {
  var decoratorArgumentCount = arguments.length;
  var decoratedDescriptor = decoratorArgumentCount < 3
    ? decoratedTarget
    : propertyDescriptor === null
      ? Object.getOwnPropertyDescriptor(decoratedTarget, propertyKey)
      : propertyDescriptor;
  if (typeof Reflect === 'object' && typeof Reflect.decorate === 'function') {
    decoratedDescriptor = Reflect.decorate(
      decorators,
      decoratedTarget,
      propertyKey,
      propertyDescriptor
    );
  } else {
    for (var decoratorIndex = decorators.length - 1; decoratorIndex >= 0; decoratorIndex -= 1) {
      var decorator = decorators[decoratorIndex];
      if (!decorator) continue;
      decoratedDescriptor = (decoratorArgumentCount < 3
        ? decorator(decoratedDescriptor)
        : decoratorArgumentCount > 3
          ? decorator(decoratedTarget, propertyKey, decoratedDescriptor)
          : decorator(decoratedTarget, propertyKey)) || decoratedDescriptor;
    }
  }
  if (decoratorArgumentCount > 3 && decoratedDescriptor) {
    Object.defineProperty(decoratedTarget, propertyKey, decoratedDescriptor);
  }
  return decoratedDescriptor;
}

function legacyAwaiter(awaiterContext, awaiterArguments, promiseConstructor, generatorFactory) {
  function adoptAwaitedState(awaitedState) {
    return awaitedState instanceof promiseConstructor
      ? awaitedState
      : new promiseConstructor(function (resolveAdoptedState) {
        resolveAdoptedState(awaitedState);
      });
  }
  return new (promiseConstructor || (promiseConstructor = Promise))(function (
    resolveAwaiter,
    rejectAwaiter
  ) {
    function continueWithFulfilledState(fulfilledState) {
      try {
        advanceGenerator(generator.next(fulfilledState));
      } catch (awaiterFailure) {
        rejectAwaiter(awaiterFailure);
      }
    }
    function continueWithRejectedState(rejectedState) {
      try {
        advanceGenerator(generator.throw(rejectedState));
      } catch (awaiterFailure) {
        rejectAwaiter(awaiterFailure);
      }
    }
    function advanceGenerator(generatorState) {
      if (generatorState.done) {
        resolveAwaiter(generatorState.value);
        return;
      }
      adoptAwaitedState(generatorState.value).then(
        continueWithFulfilledState,
        continueWithRejectedState
      );
    }
    var generator = generatorFactory.apply(awaiterContext, awaiterArguments || []);
    advanceGenerator(generator.next());
  });
}

function legacyGenerator(generatorContext, generatorBody) {
  var generatorState = {
    label: 0,
    sent: function () {
      if (generatorOperation[0] & 1) throw generatorOperation[1];
      return generatorOperation[1];
    },
    trys: [],
    ops: []
  };
  var executingGenerator;
  var delegatedGenerator;
  var generatorOperation;
  var generatorInterface;
  return generatorInterface = {
    next: createGeneratorVerb(0),
    throw: createGeneratorVerb(1),
    return: createGeneratorVerb(2)
  }, typeof Symbol === 'function' && (generatorInterface[Symbol.iterator] = function () {
    return this;
  }), generatorInterface;

  function createGeneratorVerb(operationCode) {
    return function (operationState) {
      return executeGeneratorStep([operationCode, operationState]);
    };
  }

  function executeGeneratorStep(nextOperation) {
    if (executingGenerator) throw new TypeError('Generator is already executing');
    while (generatorState) {
      try {
        executingGenerator = 1;
        if (delegatedGenerator) {
          var delegatedOperation = nextOperation[0] & 2
            ? delegatedGenerator.return
            : nextOperation[0]
              ? delegatedGenerator.throw || (
                (delegatedOperation = delegatedGenerator.return) && delegatedOperation.call(delegatedGenerator),
                0
              )
              : delegatedGenerator.next;
          if (delegatedOperation && !(delegatedOperation = delegatedOperation.call(
            delegatedGenerator,
            nextOperation[1]
          )).done) {
            executingGenerator = 0;
            return delegatedOperation;
          }
          delegatedGenerator = 0;
          if (delegatedOperation) nextOperation = [nextOperation[0] & 2, delegatedOperation.value];
        }
        switch (nextOperation[0]) {
          case 0:
          case 1:
            generatorOperation = nextOperation;
            break;
          case 4:
            generatorState.label += 1;
            executingGenerator = 0;
            return { value: nextOperation[1], done: false };
          case 5:
            generatorState.label += 1;
            delegatedGenerator = nextOperation[1];
            nextOperation = [0];
            continue;
          case 7:
            nextOperation = generatorState.ops.pop();
            generatorState.trys.pop();
            continue;
          default:
            var latestTry = generatorState.trys.length > 0
              && generatorState.trys[generatorState.trys.length - 1];
            if (!latestTry && (nextOperation[0] === 6 || nextOperation[0] === 2)) {
              generatorState = 0;
              continue;
            }
            if (nextOperation[0] === 3 && (!latestTry || (
              nextOperation[1] > latestTry[0]
              && nextOperation[1] < latestTry[3]
            ))) {
              generatorState.label = nextOperation[1];
              break;
            }
            if (nextOperation[0] === 6 && generatorState.label < latestTry[1]) {
              generatorState.label = latestTry[1];
              generatorOperation = nextOperation;
              break;
            }
            if (latestTry && generatorState.label < latestTry[2]) {
              generatorState.label = latestTry[2];
              generatorState.ops.push(nextOperation);
              break;
            }
            if (latestTry[2]) generatorState.ops.pop();
            generatorState.trys.pop();
            continue;
        }
        nextOperation = generatorBody.call(generatorContext, generatorState);
      } catch (generatorFailure) {
        nextOperation = [6, generatorFailure];
        delegatedGenerator = 0;
      } finally {
        executingGenerator = generatorOperation = 0;
      }
    }
    if (nextOperation[0] & 5) throw nextOperation[1];
    return { value: nextOperation[0] ? nextOperation[1] : void 0, done: true };
  }
}

function legacySpreadArrays() {
  var combinedLength = 0;
  for (var arrayIndex = 0; arrayIndex < arguments.length; arrayIndex += 1) {
    combinedLength += arguments[arrayIndex].length;
  }
  var combinedArray = Array(combinedLength);
  var combinedIndex = 0;
  for (var sourceArrayIndex = 0; sourceArrayIndex < arguments.length; sourceArrayIndex += 1) {
    var sourceArray = arguments[sourceArrayIndex];
    for (var sourceElementIndex = 0; sourceElementIndex < sourceArray.length; sourceElementIndex += 1) {
      combinedArray[combinedIndex] = sourceArray[sourceElementIndex];
      combinedIndex += 1;
    }
  }
  return combinedArray;
}

installLegacyTypeScriptRuntimeHelpers();

// The file is imported as a Creator plug-in so it runs before recovered
// CommonJS modules. The conditional export keeps direct diagnostic loading safe.
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    installLegacyTypeScriptRuntimeHelpers: installLegacyTypeScriptRuntimeHelpers
  };
}
