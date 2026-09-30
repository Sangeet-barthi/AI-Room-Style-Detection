"""Service layer.

Modules are imported directly (``from app.services.scoring import ...``) rather
than re-exported here, so that pure-logic modules such as ``scoring`` and
``budget`` can be imported without pulling in the database layer.
"""
