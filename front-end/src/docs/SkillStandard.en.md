# Skill Development Standard

On this platform, a Skill supplies knowledge, methods, rules, examples and reference code for AI data analysis and code generation. Authors do not need to know internal pipeline stages or interfaces. Scripts in the package are read as reference material.

## 1. Directory Structure

Submit a ZIP containing one Skill directory with a `SKILL.md` file. Explain the purpose, method, necessary inputs and expected results. Supporting references are optional. A knowledge-only Skill, a single-document Skill or a Skill for one specific dataset can receive full marks. Executable scripts and CLI entry points are not scoring requirements.

## 2. Metadata

The AI-generated name and description capture the actual capability shown by the package and are used for retrieval and selection. Local labels such as `case1` are omitted, while meaningful algorithms, dataset names, equipment models and limitations are preserved. A vibration FFT feature extraction Skill must not be described as fault diagnosis without supporting evidence. A case label alone does not lower the score; missing necessary context can.

## 3. Review and Publication

The total is 100 points, calculated by adding five dimension scores:

| Dimension | Maximum | What to provide |
|---|---:|---|
| Clear purpose | 15 | Problem, use cases and capability boundaries. |
| Useful, concrete methods | 35 | Key methods, rules, algorithms, examples or code needed to achieve the goal. |
| Accuracy and consistency | 25 | Correct, consistent prose, code, parameters and examples. |
| Required conditions and outcomes | 15 | Necessary data meanings, conditions, parameters and expected outputs. |
| Understandable, usable materials | 10 | Clear organization, correct references and accessible core information. |

Publication requires passing static checks, a completed score of **at least 80**, and successful AI name and description generation. Static checks alone allow saving a draft.

The review reads `SKILL.md` and supported `.md/.txt/.py/.json/.yaml/.yml` files. Small packages are read in full; larger packages may need one supplementary read. Reports show the actual reading coverage and evidence for each dimension. If the core materials cannot be assessed, no complete score is issued. Unread content is not automatically treated as missing content. This is a content review, not an execution test.

## 4. Review Results and Retries

Reviews use your selected personal model, normally with separate scoring and metadata calls. Supplementary reads or output corrections can add calls. If metadata generation fails, retry it separately within the report's validity period; the score and original expiry stay unchanged. Historical reports remain readable. Legacy scores must be refreshed before a new publication.
