#lang racket/base
(require racket/random)
(require racket/cmdline)
(require racket/format)
(require racket/list)
(require json)

(provide (all-defined-out))

; Answer is:
; - string
; - number
; - Choice
(struct choice (text correct) #:transparent)

; string string Answer string string number number number
(struct problem (type question answer input_answer_hint result [tries #:auto] [time #:auto] [hints #:auto])
  #:auto-value 0
  #:transparent)

; Problem -> Hash
(define (problem->jsexpr p)
  (hasheq 'type (problem-type p)
          'question (problem-question p)
          'answer (problem-answer p)
          'input_answer_hint (problem-input_answer_hint p)
          'result (problem-result p)
          'tries (problem-tries p)
          'hints (problem-hints p)))

(define (ran-bool)
  (= 0 (random 2)))

; no division because decimals are a pain
(define arith '(+ - *))
; (random-ref arith)

; List<Symbol Number Number> | Number
(define (ran-exp)
  (define expression? (ran-bool))
  (cond [expression? (list (random-ref arith) (random 1 11) (random 1 11))]
        [else (random 1 11)]))

; List<Symbols>
; random mathematical expression (+ 1 2 (* 4 6))
(define (gen-ran-arith-problem amount)
  (define (aux acc amount)
    (define ran-nest (ran-bool))
    (cond
      [(= amount 0) acc]
      [ran-nest (aux (cons (cons (random-ref arith) (list (ran-exp) (ran-exp))) acc) (sub1 amount))]
      [else (aux (cons (ran-exp) acc) (sub1 amount))]))
  (reverse (aux (list (random-ref arith)) amount)))

(define exercise-id (make-parameter 0))
(define amount (make-parameter 1))
(define disable-prism (make-parameter 0))

;; command line parser
(define parser
  (command-line
   #:usage-help
   "-e for exercise number"

   #:once-each
   [("-e" "--exercise") NUM
                        "Set the exercise id"
                        (exercise-id (string->number NUM))]

   [("-a" "--amount") NUM
                      "Set the amount to generate"
                      (amount (string->number NUM))]
   [("-p" "--prismjs") NUM
                       "Should the question be wrapped around html for prismjs?"
                       (disable-prism (string->number NUM))]
   #:args () (void)))

; used to pass into eval so + - and other functions are defined
(define-namespace-anchor anc)
(define ns (namespace-anchor->namespace anc))

(define (wrap-html str)
  (string-append "<pre class=\"line-numbers match-braces rainbow-braces\"><code class=\"language-racket\">"
                 str
                 "</code></pre>"))

(define (wrap-prism-js str)
  (cond [(= disable-prism 0) (wrap-html str)]
        [else str]))

; Number -> JSON
(define (gen-exercise mn)
  (cond
    [(= 0 mn) (define ranmath (gen-ran-arith-problem 5))
              (define prob (problem "input" (wrap-prism-js (~a ranmath)) (eval ranmath ns) "input a number eg 33" "?"))
              (problem->jsexpr prob)]
    [else
     ; (println "invalid exercise id, defaulting to 0")
     (gen-exercise 0)]))

(define res (map (lambda (i)
                   (gen-exercise (exercise-id))) (range (amount))))

(printf "~a\n" (jsexpr->bytes res))
;(println (gen-exercise (exercise-id)))