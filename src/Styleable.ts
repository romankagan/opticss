import { inspect } from "util";
import { CompoundSelector, ParsedSelector } from "./parseSelector";
import * as SelectorParser from "postcss-selector-parser";
import { SourceLocation } from "./SourceLocation";
import assertNever from "./util/assertNever";

// TODO: make styleables belong to a template. that template can have template-wide config associated to it.
// E.g. namespace mappings.

export enum Match {
  /**
   * The element will definitively match the selector or selector component in
   * at least dynamic one state.
   */
  yes = 1,
  /**
   * The element may match the selector or selector component; information is
   * ambiguous.
   */
  maybe = 2,
  /** The element will not match the selector or selector component. */
  no = 3,
  /**
   * The element is unrelated to the selector or selector component and no
   * information about whether the element matches can be determined.
   */
  pass = 3
}

/**
 * true => Match.yes
 * false => Match.no
 * null => Match.pass
 * undefined => Match.maybe
 */
export function boolToMatch(value: boolean | null | undefined): Match {
  if (value === true) {
    return Match.yes;
  } else if (value === false) {
    return Match.no;
  } else if (value === undefined) {
    return Match.maybe;
  } else {
    return Match.pass;
  }
}

export function matchToBool(match: Match): boolean | null | undefined {
  switch(match) {
    case Match.yes:
      return true;
    case Match.no:
      return false;
    case Match.maybe:
      return undefined;
    case Match.pass:
      return null;
    default:
      return assertNever(match);
  }
}

export interface Styleable {
  /**
   * Returns true if the styleable can definitively prove that a compound
   * selector will not match an element with this styleable.
   *
   * For instance if a selector was `a.foo` and the styleable was for a tag name `span`,
   * then it would return true. But it would return false for `.foo` because it might match
   * that selector.
   */
  matchSelector(selector: ParsedSelector): Match;
  matchSelectorComponent(selector: CompoundSelector): Match;
  matchSelectorNode(node: SelectorParser.Node): Match;
}

export interface HasNamespace {
  readonly namespaceURL: string | null;
}

// Ok so a quick rundown on the type strategy for tagname and attribute values:
// There are exclusive interfaces that can be passed in and this prevents the
// creation of nonsensical value data like `{unknown: true, value: "asdf"}`. But
// when it comes time to read these values we have to read them off a data type
// where any of the values might be present without introducing a bunch of
// casting So the normalized types are a superset of the types that are exlusive
// when passed as arguments. This keeps us from having to do a bunch of casting.

/**
 * A value that contains no dynamic component.
 *
 * Sometimes a dynamic value is one of several known constant values, in those cases
 * a ValueChoice should be used.
 */
export interface ValueConstant {
  constant: string;
}

/**
 * Indicates the value, if it exists, may have any possible value including
 * possibly whitespace characters.
 */
export interface ValueUnknown {
  unknown: true;
}

/**
 * Indicates the value, if it exists, may have any possible value but will
 * only be a single identifier.
 */
export interface ValueUnknownIdentifier {
  unknownIdentifier: true;
}

/**
 * Indicates there is no value.
 */
export interface ValueAbsent {
  absent: true;
}

/**
 * The only thing that is known about the value is a constant prefix.
 *
 * This might be used when a value is set to a constant value concatenated with a dynamic expression.
 * In some clases this is enough information to decide that a selector doesn't match.
 */
export interface ValueStartsWith {
  startsWith: string;
  whitespace: boolean;
}

/**
 * The only thing that is known about the value is a constant suffix.
 *
 * This might be used when a value is set to a constant value concatenated with a dynamic expression.
 * In some clases this is enough information to decide that a selector doesn't match.
 */
export interface ValueEndsWith {
  endsWith: string;
  whitespace: boolean;
}

/**
 * The only thing that is known about the value is a constant prefix and suffix.
 *
 * This might be used when a value has a dynamic expression embedded within a a constant value.
 * In some clases this is enough information to decide that a selector doesn't match.
 */
export type ValueStartsAndEndsWith = ValueStartsWith & ValueEndsWith;

export type AttributeValueChoiceOption =
  ValueAbsent |
  ValueConstant |
  ValueStartsWith |
  ValueEndsWith |
  ValueStartsAndEndsWith |
  AttributeValueSet;

export type NormalizedAttributeValueChoiceOption =
  Partial<ValueAbsent> &
  Partial<ValueConstant> &
  Partial<ValueStartsWith> &
  Partial<ValueEndsWith> &
  Partial<ValueStartsAndEndsWith> &
  Partial<NormalizedAttributeValueSet>;

/**
 * The value may have one of several values.
 * Assumed to match if any of the choices matches.
 */
export interface AttributeValueChoice {
  oneOf: Array<AttributeValueChoiceOption>;
}

export interface NormalizedAttributeValueChoice {
  oneOf: Array<NormalizedAttributeValueChoiceOption>;
}

export type AttributeValueSetItem =
  ValueUnknownIdentifier |
  ValueConstant |
  ValueStartsWith |
  ValueEndsWith |
  ValueStartsAndEndsWith |
  AttributeValueChoice;

export type NormalizedAttributeValueSetItem =
  Partial<ValueUnknownIdentifier> &
  Partial<ValueConstant> &
  Partial<ValueStartsWith> &
  Partial<ValueEndsWith> &
  Partial<ValueStartsAndEndsWith> &
  Partial<NormalizedAttributeValueChoice>;

/**
 * An attribute value set represents a space delimited set of values
 * like you would expect to find in an html class attribute.
 */
export interface AttributeValueSet {
  allOf: Array<AttributeValueSetItem>;
}

export interface NormalizedAttributeValueSet {
  allOf: Array<NormalizedAttributeValueSetItem>;
}

export type AttributeValue =
  ValueAbsent |
  ValueUnknown |
  ValueUnknownIdentifier |
  ValueConstant |
  ValueStartsWith |
  ValueEndsWith |
  ValueStartsAndEndsWith |
  AttributeValueChoice |
  AttributeValueSet;

export type NormalizedAttributeValue =
  Partial<ValueAbsent> &
  Partial<ValueUnknown> &
  Partial<ValueUnknownIdentifier> &
  Partial<ValueConstant> &
  Partial<ValueStartsWith> &
  Partial<ValueEndsWith> &
  Partial<ValueStartsAndEndsWith> &
  Partial<NormalizedAttributeValueChoice> &
  Partial<NormalizedAttributeValueSet>;

export type FlattenedAttributeValueSetItem =
  Partial<ValueUnknownIdentifier> &
  Partial<ValueConstant> &
  Partial<ValueStartsWith> &
  Partial<ValueEndsWith> &
  Partial<ValueStartsAndEndsWith>;

export interface FlattenedAttributeValueSet {
  allOf: Array<FlattenedAttributeValueSetItem>;
}

export type FlattenedAttributeValue =
  Partial<ValueAbsent> &
  Partial<ValueUnknown> &
  Partial<ValueUnknownIdentifier> &
  Partial<ValueConstant> &
  Partial<ValueStartsWith> &
  Partial<ValueEndsWith> &
  Partial<ValueStartsAndEndsWith> &
  Partial<FlattenedAttributeValueSet>;

export interface SerializedAttribute {
  namespaceURL?: string | null;
  name: string;
  value: NormalizedAttributeValue;
}

/**
 * Represents an arbitrary html attribute in a document. Based on the value type it will match against
 * the attribute selector syntax as follows:
 *
 * ValueUnknown:
 *   * Never excludes a selector that involves the attribute.
 *
 * ValueAbsent:
 *   * Will not match selectors that require a value to be present.
 *
 * ValueChoice:
 *   * Will exclude a selector if all of the choices exclude it.
 *
 * ValueConstant:
 *   * [attr] irregardless of the constant value.
 *   * [attr=value] if the constant value is value.
 *   * [attr^=value] if the constant value starts with value.
 *   * [attr$=value] if the constant value ends with value.
 *   * [attr|=value] if the constant value is value or is prefixed value followed by a '-'.
 *   * [attr~=value] if the space-separated constant value includes the word value.
 *   * [attr*=value] if the constant value includes value.
 *
 * ValueStartsWith:
 *   * [attr] irregardless of the startsWith value.
 *   * [attr=value] if the value starts with the startsWith value.
 *   * [attr^=value] if the startsWith value starts with value or vice versa.
 *   * [attr$=value] assumed to match the unspecified trailing value.
 *   * [attr|=value] if the startsWith value starts with '<value>-'
 *   * [attr~=value] assumed to match the unspecified trailing value.
 *   * [attr*=value] assumed to match the unspecified trailing value.
 *
 * ValueEndsWith:
 *   * [attr] irregardless of the endsWith value.
 *   * [attr=value] if the value ends with the endsWith value.
 *   * [attr^=value] assumed to match the unspecified leading value.
 *   * [attr$=value] if the endsWith value ends with value or vice versa.
 *   * [attr|=value] assumed to match against the unspecified leading value.
 *   * [attr~=value] assumed to match the unspecified leading value.
 *   * [attr*=value] assumed to match the unspecified leading value.
 *
 * ValueStartsAndEndsWith:
 *   * [attr] irregardless of the endsWith value.
 *   * [attr=value] if the value starts with the startsWith value and ends with the endsWith value.
 *   * [attr^=value] if the startsWith value starts with value or vice versa.
 *   * [attr$=value] if the endsWith value ends with value or vice versa.
 *   * [attr|=value] if the startsWith value starts with '<value>-'
 *   * [attr~=value] assumed to match the unspecified middle value.
 *   * [attr*=value] assumed to match the unspecified middle value.
 */
export abstract class AttributeBase implements Styleable, HasNamespace {
  private _namespaceURL: string | null;
  private _name: string;
  private _value: NormalizedAttributeValue;

  constructor(namespaceURL: string | null, name: string, value: AttributeValue = { unknown: true }) {
    this._namespaceURL = namespaceURL;
    this._name = name;
    this._value = value;
  }

  get namespaceURL(): string | null {
    return this._namespaceURL;
  }
  get name(): string {
    return this._name;
  }
  get value(): NormalizedAttributeValue {
    return this._value;
  }

  /**
   * Check whether the value is legal according to the attribute's value expression.
   */
  isLegal(value: string, condition?: NormalizedAttributeValue): boolean {
    condition = condition || this.value;
    if (condition.unknown) {
      return true;
    } else if (condition.unknownIdentifier) {
      return !/\s/.test(value);
    } else if (condition.absent) {
      return value.length === 0;
    } else if (condition.constant) {
      return value === condition.constant;
    } else if (condition.startsWith || condition.endsWith) {
      let start = condition.startsWith || "";
      let end = condition.endsWith || "";
      let matches = value.startsWith(start) && value.endsWith(end);
      if (!matches) return false;
      let middle = value.substring(start.length, value.length - end.length);
      return (condition.whitespace || !middle.match(/\s/));
    } else if (condition.oneOf) {
      return condition.oneOf.some(cond => this.isLegal(value, cond));
    } else if (condition.allOf) {
      let values = value.split(/\s+/);
      // TODO: this is wrong because it allows some classes to be used more than
      // once and others to not be used at all and also because some conditions
      // may require multiple values.
      //
      // The algorithm should be something like:
      // If there is a set value (`allOf`) we must remove all choice values
      // (`oneOf`) by permuting the values into flat lists where each element
      // must be legal against a single value of the split input. each value in
      // split list must be tested against each condition. If there is a value
      // that didn't test true return false for that permutation. If multiple
      // values test true, ensure that there is a value that tests true for each
      // condition once and only once. If there is a permutation that passes
      // exit early and return true otherwise false. This feels like a case
      // where we can apply dynamic programming. Perhaps something like:
      // https://stackoverflow.com/questions/11376672/partial-subtree-matching-algorithm
      //
      // it's not clear if we need this yet, so I'm going to leave it broken for now.
      return condition.allOf.every(cond => values.some(v => this.isLegal(v, cond)));
    } else {
      return false;
    }
  }

  /**
   * Match an attribute against a single string value. This is used
   * by the id selector and some attribute selectors.
   *
   * @param identifier The identifier in the selector to match against the
   *   element's attribute value.
   * @param [value=this.value] the attribute value to match against.
   * @returns boolean if it matches or not
   */
  matchIdent(identifier: string, value: NormalizedAttributeValue = this.value): boolean {
    if (value.absent) {
      return false;
    } else if (value.unknown) {
      return true;
    } else if (value.unknownIdentifier) {
      return true;
    } else if (value.constant) {
      if (value.constant === identifier) {
        return true;
      } else {
        return false;
      }
    } else if (value.startsWith || value.endsWith) {
      if (value.startsWith && !identifier.startsWith(value.startsWith)) {
        return false;
      }
      if (value.endsWith && !identifier.endsWith(value.endsWith)) {
        return false;
      }
      return true;
    } else if (value.allOf) {
      // This is a tricky case. There really shouldn't be an `allOf` used
      // for an identifier match. In theory a regex could be constructed?
      // I'm hesitant to throw an error here but maybe I should?
      return false;
    } else if (value.oneOf) {
      if (value.oneOf.some(v => this.matchIdent(identifier, v) === true)) {
        return true;
      } else {
        return false;
      }
    } else {
      throw new Error(`Unexpected value: ${inspect(value)}`);
    }
  }

  /**
   * Match an attribute against an attribute value using space delimited
   * matching semantics. This is used by the class selector and some attribute
   * selectors.
   * @param identifier The identifier in the selector to match against the
   *   element's attribute value.
   * @param [value=this.value] the attribute value to match against.
   * @returns boolean if it matches
   */
  matchWhitespaceDelimited(identifier: string, value: NormalizedAttributeValue = this.value): boolean {
    if (value.absent) {
      return false;
    } else if (value.unknown) {
      return true;
    } else if (value.unknownIdentifier) {
      return true;
    } else if (value.constant) {
      return (value.constant === identifier);
    } else if (value.startsWith || value.endsWith) {
      if (value.whitespace) {
        // the unknown part of the attribute can contain whitespace so we have
        // to assume it matches.
        return true;
      }
      if (value.startsWith && !identifier.startsWith(value.startsWith)) {
        return false;
      }
      if (value.endsWith && !identifier.endsWith(value.endsWith)) {
        return false;
      }
      return true;
    } else if (value.allOf || value.oneOf) {
      return (value.allOf || value.oneOf)!.some(v => this.matchIdent(identifier, v));
    } else {
      throw new Error(`Unexpected value: ${inspect(value)}`);
    }
  }

  matchAttributeNode(node: SelectorParser.Node): Match {
    // TODO
    if (node) {
      return Match.yes;
    } else {
      return Match.no;
    }
  }

  matchSelectorNode(node: SelectorParser.Node): Match {
    switch(node.type) {
      case "string":
      case "selector":
      case "root":
      case "comment":
      case "combinator":
      case "nesting":
      case "pseudo":
        return Match.pass;
      case "tag":
        return Match.no;
      case "id":
        if (this.name === "id" && this.namespaceURL === null) {
          return boolToMatch(this.matchIdent(node.value));
        } else {
          return Match.no;
        }
      case "class":
        if (this.name === "class" && this.namespaceURL === null) {
          return boolToMatch(this.matchWhitespaceDelimited(node.value));
        } else {
          return Match.no;
        }
      case "attribute":
        let a = <SelectorParser.Attribute>node;
        // TODO: unclear whether this is the namespace url or prefix from
        // postcss-selector-parser (it's probably the prefix so this is probably
        // broken).
        if (a.attribute === this.name && a.namespace === this.namespaceURL) {
          return this.matchAttributeNode(node);
        } else {
          return Match.no;
        }
      case "universal":
        return Match.yes;
    }
  }

  matchSelectorComponent(selector: CompoundSelector): Match {
    let no = false;
    let maybe = false;
    selector.nodes.forEach(node => {
      let match = this.matchSelectorNode(node);
      switch(match) {
        case Match.no:
          no = true;
          break;
        case Match.maybe:
          maybe = true;
          break;
        case Match.yes:
        case Match.pass:
          break;
        default:
          assertNever(match);
      }
    });
    if (no) {
      return Match.no;
    } else if (maybe) {
      return Match.maybe;
    } else {
      return Match.yes;
    }
  }

  matchSelector(selector: ParsedSelector): Match {
    return matchSelector(this, selector);
  }

  flattenedValue(value: NormalizedAttributeValue = this.value): Array<FlattenedAttributeValue> {
    if (value.allOf) {
        let newSets = new Array<FlattenedAttributeValueSet>();
        newSets.push({
          allOf: new Array<FlattenedAttributeValueSetItem>()
        });
        value.allOf.forEach(v => {
          if (v.oneOf) {
            let res = this.flattenedValue(v);
            let origLength = newSets.length;
            for (let i = 0; i < res.length; i++) {
              for (let j = 0; j < origLength; j++) {
                if (res[i].allOf) {
                  newSets.push({
                    allOf: newSets[j].allOf.concat(res[i].allOf!)
                  });
                } else {
                  newSets.push({
                    allOf: newSets[j].allOf.concat(res[i])
                  });
                }
              }
            }
            for (let j = 0; j < origLength; j++) {
              newSets.shift();
            }
          } else {
            newSets.forEach(newSet => {
              newSet.allOf.push(v);
            });
          }
        });
        return newSets;
    } else if (value.oneOf) {
      let values = new Array<FlattenedAttributeValue>();
      value.oneOf.forEach(v => {
        if (v.allOf) {
          let res = this.flattenedValue(v);
          values = values.concat(res);
        } else {
          values.push(v);
        }
      });
      return values;
    } else {
      return [value];
    }
  }

  valueToString(value: NormalizedAttributeValue): string {
    if (value.unknown) {
      return "???";
    } else if (value.unknownIdentifier) {
      return "?";
    } else if (value.constant) {
      return `${value.constant}`;
    } else if (value.startsWith && value.endsWith) {
      return value.startsWith + "*" + value.endsWith;
    } else if (value.startsWith) {
      return value.startsWith + "*";
    } else if (value.endsWith) {
      return "*" + value.endsWith;
    } else if (value.oneOf) {
      return "(" + value.oneOf.reduce((prev, v) => {
        if (v.absent) {
          prev.push("---");
        } else {
          prev.push(this.valueToString(v));
        }
        return prev;
      }, new Array<string>()).join("|") + ")";
    } else if (value.allOf) {
      return value.allOf.map(v => this.valueToString(v)).join(" ");
    } else {
      throw new Error(`INTERNAL ERROR: Missing case for: ${inspect(value)}`);
    }
  }

  toString() {
    let plainAttr;
    if (this.value.absent) {
      plainAttr = `${this.name}`;
    } else {
      plainAttr = `${this.name}="${this.valueToString(this.value)}"`;
    }

    if (this.namespaceURL) {
      return `${this.namespaceURL}:${plainAttr}`;
    } else {
      return plainAttr;
    }
  }

  toJSON(): SerializedAttribute {
    let result: SerializedAttribute = {
      name: this.name,
      value: this.value,
    };
    if (this.namespaceURL) {
      result.namespaceURL = this.namespaceURL;
    }
    return result;
  }

  static fromJSON(json: SerializedAttribute): AttributeNS | Attribute | Identifier | Class {
    if (json.namespaceURL) {
      return new AttributeNS(json.namespaceURL, json.name, json.value as ValueConstant);
    } else {
      if (name === "id") {
        return new Identifier(json.value as ValueConstant);
      } else if (name === "class") {
        return new Class(json.value as ValueConstant);
      } else {
        return new Attribute(json.name, json.value as ValueConstant);
      }
    }
  }
}

export class AttributeNS extends AttributeBase {
  constructor(namespaceURL: string, name: string, value: AttributeValue = {unknown: true}) {
    super(namespaceURL, name, value);
  }
}

export class Attribute extends AttributeBase {
  constructor(name: string, value: AttributeValue = {unknown: true}) {
    super(null, name, value);
  }
}

export class Identifier extends Attribute {
  constructor(value: AttributeValue = { unknown: true }) {
    super("id", value);
  }
}

export class Class extends Attribute {
  constructor(value: AttributeValue = { unknown: true }) {
    super("class", value);
  }
}

export type Attr = Attribute | AttributeNS | Identifier | Class;

export type Tag = Tagname | TagnameNS;

export interface TagnameValueChoice {
  oneOf: Array<string>;
}

export type TagnameValue =
  ValueUnknown |
  ValueConstant |
  TagnameValueChoice;

export type NormalizedTagnameValue =
  Partial<ValueUnknown> &
  Partial<ValueConstant> &
  Partial<TagnameValueChoice>;

function isTag(tag: {type: string} | undefined): tag is SelectorParser.Tag {
  if (tag) {
    return tag.type === SelectorParser.TAG;
  } else {
    return false;
  }
}

export interface SerializedTagname {
  namespaceURL?: string | null;
  value: NormalizedTagnameValue;
}

export abstract class TagnameBase implements Styleable, HasNamespace {
  private _namespaceURL: string | null;
  private _value: NormalizedTagnameValue;
  constructor(namespaceURL: string | null, value: TagnameValue) {
    this._namespaceURL = namespaceURL || null;
    this._value = value;
  }

  get namespaceURL(): string | null {
    return this._namespaceURL;
  }

  get value(): NormalizedTagnameValue {
    return this._value;
  }

  getTag(selector: SelectorParser.Node | CompoundSelector): SelectorParser.Tag | undefined {
    if (selector instanceof CompoundSelector) {
      let node = selector.nodes.find((node) => isTag(node));
      return node as SelectorParser.Tag;
    } else {
      if (isTag(selector)) {
        return selector;
      } else {
        return undefined;
      }
    }
  }

  matchSelector(selector: ParsedSelector): Match {
    return matchSelector(this, selector);
  }
  matchSelectorComponent(selector: CompoundSelector): Match {
    let tag = this.getTag(selector);
    if (tag) {
      return this.matchSelectorNode(tag);
    } else {
      return Match.no;
    }
  }

  matchSelectorNode(node: SelectorParser.Node): Match {
    if (isTag(node)) {
      if (this.value.constant) {
        return boolToMatch(node.value === this.value.constant);
      } else if (this.value.oneOf) {
        return boolToMatch(this.value.oneOf.some(v => v === node.value));
      } else if (this.value.unknown) {
        return Match.maybe;
      } else {
        return assertNever(<never>node);
      }
    } else {
      return Match.pass;
    }
  }

  valueToString(): string {
    if (this.value.unknown) {
      return "???";
    } else if (this.value.constant) {
      return this.value.constant;
    } else if (this.value.oneOf) {
      return this.value.oneOf.join("|");
    } else {
      throw new Error(`Malformed tagname value: ${inspect(this.value)}`);
    }
  }

  toString() {
    if (this.namespaceURL === null) {
      return `${this.valueToString()}`;
    } else {
      return `${this.namespaceURL}:${this.valueToString()}`;
    }
  }

  toJSON(): SerializedTagname {
    let result: SerializedTagname = {
      value: this.value
    };
    if (this.namespaceURL) {
      result.namespaceURL = this.namespaceURL;
    }
    return result;
  }
  static fromJSON(json: SerializedTagname): TagnameNS | Tagname {
    if (json.namespaceURL) {
      return new TagnameNS(json.namespaceURL, json.value as ValueConstant);
    } else {
      return new Tagname(json.value as ValueConstant);
    }
  }
}

export class TagnameNS extends TagnameBase {
  constructor(namespaceURL: string, value: TagnameValue) {
    super(namespaceURL, value);
  }
}

export class Tagname extends TagnameBase {
  constructor(value: TagnameValue) {
    super(null, value);
  }
}

export interface ElementInfo<TagnameType = TagnameBase, AttributeType = AttributeBase> {
  sourceLocation?: SourceLocation;
  tagname: TagnameType;
  attributes: Array<AttributeType>;
  id?: string;
}

export type SerializedElementInfo = ElementInfo<SerializedTagname, SerializedAttribute>;

export function willNotMatch(element: ElementInfo, selector: CompoundSelector): boolean {
  for (let i = 0; i < selector.nodes.length; i++) {
    let node = selector.nodes[i];
    switch(node.type) {
      case "comment":  // never matters
      case "string":   // only used as a child of other selector nodes.
      case "selector": // only used as a child of other selector nodes.
        continue;
      case "root":
      case "nesting":
      case "combinator":
        // This is indicative of some sort of programming error.
        throw new Error(`[Internal Error] Illegal selector node: ${inspect(node)}`);
      case "pseudo":
      case "universal":
        // Both of these cases used in isolation are a match but we can't return
        // false yet because it could be used with other nodes that exclude a
        // match. The final return of false handles this case in isolation.
        continue;
      case "class":
      case "id":
        let idOrClass = attr(element, node.type);
        if (idOrClass && idOrClass.matchSelectorNode(node) === Match.no || !idOrClass) {
          return true;
        }
        break;
      case "tag":
        let tag = element.tagname;
        if (tag.matchSelectorNode(node) === Match.no) {
          return true;
        }
      case "attribute":
        let anAttr = attr(element, (<SelectorParser.Attribute>node).attribute);
        if (anAttr && anAttr.matchSelectorNode(node) === Match.no || !anAttr) {
          return true;
        }
        break;
      default:
        assertNever(node.type);
    }
  }
  return false;
}

/*
function isNamespaceAttr(attr: AttributeBase | undefined): attr is AttributeNS {
  if (attr && attr.namespaceURL) {
    return true;
  } else {
    return false;
  }
}

function isAttr(attr: AttributeBase | undefined): attr is Attribute {
  if (attr && attr.namespaceURL === null) {
    return true;
  } else {
    return false;
  }
}
*/

function attr(element: ElementInfo, name: string, namespaceURL?: string): Attribute | AttributeNS | undefined {
  let attr = element.attributes.find(attr => {
    return attr.name === name &&
           attr.namespaceURL === namespaceURL;
  });
  return attr;
}

function matchSelector(styleable: Styleable, parsedSelector: ParsedSelector, keySelector = false): Match {
  let selector = keySelector ? parsedSelector.key : parsedSelector.selector;
  let match: Match;
  let maybe = false;
  // tslint:disable-next-line:label-position
  match_again: {
    match = styleable.matchSelectorComponent(selector);
    if (match === Match.no) return Match.no;
    if (match === Match.maybe) maybe = true;
    if (selector.next) {
      selector = selector.next.selector;
      break match_again;
    }
  }
  if (maybe) {
    return Match.maybe;
  } else {
    return Match.yes;
  }
}