# -*- coding: utf-8 -*-
from flask import Flask, Response, request
import random
import time

app = Flask(__name__)

def decode_text(txt):
    chars = "↔◁◀▷▶♤♠♡♥♧♣⊙◈▣◐◑▒▤▥▨▧▦▩♨☏☎☜☞↕↗↙↖↘♩♬㉿㈜㏇™㏂㏘＂＇∼ˇ˘˝¡˚˙˛¿ː∏￦℉€㎕㎖㎗ℓ㎘㎣㎤㎥㎦㎙㎚㎛㎟㎠㎢㏊㎍㏏㎈㎉㏈㎧㎨㎰㎱㎲㎳㎴㎵㎶㎷㎸㎀㎁㎂㎃㎄㎺㎻㎼㎽㎾㎿㎐㎑㎒㎓㎔Ω㏀㏁㎊㎋㎌㏖㏅㎭㎮㎯㏛㎩㎪㎫㎬㏝㏐㏓㏃㏉㏜㏆┒┑┚┙┖┕┎┍┞┟┡┢┦┧┪┭┮┵┶┹┺┽┾╀╁╃╄╅╆╇╈╉╊┱┲ⅰⅱⅲⅳⅴⅵⅶⅷⅸⅹ½⅓⅔¼¾⅛⅜⅝⅞ⁿ₁₂₃₄ŊđĦĲĿŁŒŦħıĳĸŀłœŧŋŉ㉠㉡㉢㉣㉤㉥㉦㉧㉨㉩㉪㉫㉬㉭㉮㉯㉰㉱㉲㉳㉴㉵㉶㉷㉸㉹㉺㉻㈀㈁㈂㈃㈄㈅㈆㈇㈈㈉㈊㈋㈌㈍㈎㈏㈐㈑㈒㈓㈔㈕㈖㈗㈘㈙㈚㈛ⓐⓑⓒⓓⓔⓕⓖⓗⓘⓙⓚⓛⓜⓝⓞⓟⓠⓡⓢⓣⓤⓥⓦⓧⓨⓩ①②③④⑤⑥⑦⑧⑨⑩⑪⑫⑬⑭⑮⒜⒝⒞⒟⒠⒡⒢⒣⒤⒥⒦⒧⒨⒩⒪⒫⒬⒭⒮⒯⒰⒱⒲⒳⒴⒵⑴⑵⑶⑷⑸⑹⑺⑻⑼⑽⑾⑿⒀⒁⒂"
    for c in chars:
        if c in txt:
            txt = txt.replace(c,"\\u" + str(hex(ord(c)))[2:])
    return txt

def encode_text(txt):
    result = []
    index = 0
    length = len(txt)

    while index < length:
        if txt[index] != "\\":
            result.append(txt[index])
            index += 1
            continue

        run_start = index
        while index < length and txt[index] == "\\":
            index += 1

        run_length = index - run_start
        unicode_digits = txt[index + 1:index + 5]
        if (
            run_length % 2 == 1
            and index < length
            and txt[index].lower() == "u"
            and len(unicode_digits) == 4
            and all(char in "0123456789abcdefABCDEF" for char in unicode_digits)
        ):
            result.append(chr(int(unicode_digits, 16)))
            index += 5
        else:
            result.append("\\" * run_length)

    return "".join(result)

def main():
    app.run()

@app.route("/")
def home():
    return "ezTranslator J2K Web Wrapper"

@app.route("/translate")
def webtranslate():
    wait = random.random() * 3
    time.sleep(wait)
    src_text = request.args.get('text', '')
    translated_text = encode_text('T: ' + decode_text(src_text))
    return Response(translated_text, mimetype='text/plain; charset=utf-8')

if __name__ == '__main__':
    main()
